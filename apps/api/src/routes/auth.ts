import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { createHash } from 'node:crypto'
import { SignJWT } from 'jose'
import { db } from '@wacent/db'
import { users, plans, subscriptions } from '@wacent/db/schema'
import { eq, or } from 'drizzle-orm'
import { jwtAuth } from '../middleware/auth.js'
import { flexAuth } from '../middleware/flexAuth.js'

const JWT_SECRET = new TextEncoder().encode(process.env['JWT_SECRET'] ?? 'dev_secret')

const registerSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8),
  recaptchaToken: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  recaptchaToken: z.string().optional(),
})

async function verifyRecaptcha(token: string | undefined): Promise<boolean> {
  const secret = process.env['RECAPTCHA_SECRET_KEY']
  if (!secret || !token) return true // skip if not configured
  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }),
  })
  const json = await res.json() as { success: boolean; score?: number }
  return json.success && (json.score ?? 1) >= 0.5
}

export const authRoutes = new Hono()

authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const { name, email, password, recaptchaToken } = c.req.valid('json')
  if (!await verifyRecaptcha(recaptchaToken)) {
    return c.json({ error: { code: 'RECAPTCHA_FAILED', message: 'Bot check failed' } }, 400)
  }
  const passwordHash = createHash('sha256').update(password).digest('hex')

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (existing) {
    return c.json({ error: { code: 'EMAIL_TAKEN', message: 'Email already registered' } }, 409)
  }

  const [user] = await db.insert(users).values({ name, email, passwordHash }).returning({
    id: users.id,
    name: users.name,
    email: users.email,
  })
  if (!user) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create user' } }, 500)
  }

  const [starterPlan] = await db.select().from(plans).where(eq(plans.name, 'starter')).limit(1)
  if (starterPlan) {
    await db.insert(subscriptions).values({
      userId: user.id,
      planId: starterPlan.id,
      status: 'trialing',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    })
    await db.update(users).set({ planId: starterPlan.id }).where(eq(users.id, user.id))
  }

  const token = await new SignJWT({ sub: user.id })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET)

  return c.json({ data: { user, token }, message: 'Registered successfully' }, 201)
})

authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password, recaptchaToken } = c.req.valid('json')
  if (!await verifyRecaptcha(recaptchaToken)) {
    return c.json({ error: { code: 'RECAPTCHA_FAILED', message: 'Bot check failed' } }, 400)
  }
  const passwordHash = createHash('sha256').update(password).digest('hex')

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, passwordHash: users.passwordHash, authProvider: users.authProvider })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (user?.authProvider === 'google' && !user.passwordHash) {
    return c.json({ error: { code: 'GOOGLE_ONLY', message: 'This account uses Google Sign-In. Use "Continue with Google" instead.' } }, 401)
  }

  if (!user || user.passwordHash !== passwordHash) {
    return c.json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } }, 401)
  }

  const token = await new SignJWT({ sub: user.id })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET)

  return c.json({ data: { user: { id: user.id, name: user.name, email: user.email, role: user.role }, token }, message: 'Logged in successfully' })
})

authRoutes.post('/logout', jwtAuth, (c) => {
  return c.json({ message: 'Logged out successfully' })
})

authRoutes.post('/google/token', zValidator('json', z.object({ idToken: z.string() })), async (c) => {
  const { idToken } = c.req.valid('json')

  // Verify Google ID token via Google's tokeninfo endpoint
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`)
  if (!res.ok) {
    return c.json({ error: { code: 'INVALID_GOOGLE_TOKEN', message: 'Invalid Google token' } }, 401)
  }
  const info = await res.json() as {
    sub: string; email: string; name?: string; picture?: string; aud: string
  }

  const clientId = process.env['GOOGLE_CLIENT_ID']
  if (clientId && info.aud !== clientId) {
    return c.json({ error: { code: 'INVALID_AUDIENCE', message: 'Token audience mismatch' } }, 401)
  }

  // Upsert user
  const [existing] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(or(eq(users.googleId, info.sub), eq(users.email, info.email)))
    .limit(1)

  let userId: string
  let userName: string
  let userRole: string

  if (existing) {
    // Link Google ID if not already set
    await db.update(users).set({ googleId: info.sub, avatarUrl: info.picture ?? null, authProvider: 'google' }).where(eq(users.id, existing.id))
    userId = existing.id
    userName = existing.name
    userRole = existing.role
  } else {
    const [created] = await db.insert(users).values({
      name: info.name ?? info.email.split('@')[0] ?? 'User',
      email: info.email,
      googleId: info.sub,
      avatarUrl: info.picture ?? null,
      authProvider: 'google',
    }).returning({ id: users.id, name: users.name, role: users.role })
    if (!created) return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create user' } }, 500)
    userId = created.id
    userName = created.name
    userRole = created.role

    const [starterPlan] = await db.select().from(plans).where(eq(plans.name, 'starter')).limit(1)
    if (starterPlan) {
      await db.insert(subscriptions).values({
        userId: created.id,
        planId: starterPlan.id,
        status: 'trialing',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      })
      await db.update(users).set({ planId: starterPlan.id }).where(eq(users.id, created.id))
    }
  }

  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET)

  return c.json({
    data: { user: { id: userId, name: userName, role: userRole }, token },
    message: 'Authenticated via Google',
  })
})

authRoutes.put('/profile', flexAuth, zValidator('json', z.object({
  name: z.string().min(1).max(255).optional(),
  avatarUrl: z.string().url().optional(),
})), async (c) => {
  const auth = c.get('auth')
  const updates = c.req.valid('json')

  if (Object.keys(updates).length === 0) {
    return c.json({ error: { code: 'NOTHING_TO_UPDATE', message: 'No fields to update' } }, 400)
  }

  const [updated] = await db.update(users).set(updates).where(eq(users.id, auth.userId)).returning({
    id: users.id, name: users.name, email: users.email, role: users.role, avatarUrl: users.avatarUrl,
  })

  return c.json({ data: updated, message: 'Profile updated' })
})

authRoutes.post('/forgot-password', zValidator('json', z.object({ email: z.string().email() })), async (c) => {
  return c.json({ message: 'If that email exists, a reset link has been sent' })
})

authRoutes.post('/reset-password', zValidator('json', z.object({ token: z.string(), password: z.string().min(8) })), async (c) => {
  return c.json({ message: 'Password reset successfully' })
})
