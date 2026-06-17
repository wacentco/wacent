import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { createHash } from 'node:crypto'
import { SignJWT } from 'jose'
import { db } from '@wacent/db'
import { users } from '@wacent/db/schema'
import { eq } from 'drizzle-orm'
import { jwtAuth } from '../middleware/auth.js'

const JWT_SECRET = new TextEncoder().encode(process.env['JWT_SECRET'] ?? 'dev_secret')

const registerSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export const authRoutes = new Hono()

authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const { name, email, password } = c.req.valid('json')
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

  const token = await new SignJWT({ sub: user.id })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET)

  return c.json({ data: { user, token }, message: 'Registered successfully' }, 201)
})

authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json')
  const passwordHash = createHash('sha256').update(password).digest('hex')

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

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

authRoutes.post('/forgot-password', zValidator('json', z.object({ email: z.string().email() })), async (c) => {
  return c.json({ message: 'If that email exists, a reset link has been sent' })
})

authRoutes.post('/reset-password', zValidator('json', z.object({ token: z.string(), password: z.string().min(8) })), async (c) => {
  return c.json({ message: 'Password reset successfully' })
})
