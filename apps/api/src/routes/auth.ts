import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { createHash, randomBytes } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import { db } from '@wazap/db'
import { users } from '@wazap/db/schema'
import { eq } from 'drizzle-orm'

const JWT_SECRET = new TextEncoder().encode(process.env['JWT_SECRET'] ?? 'dev_secret')

const registerSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const authRoutes = new Hono()

authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const { name, email, password } = c.req.valid('json')

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (existing) {
    return c.json({ error: { code: 'EMAIL_TAKEN', message: 'Email already registered' } }, 409)
  }

  const passwordHash = createHash('sha256').update(password).digest('hex')
  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash })
    .returning({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })

  return c.json({ data: user, message: 'Account created' }, 201)
})

authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json')
  const passwordHash = createHash('sha256').update(password).digest('hex')

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, passwordHash: users.passwordHash })
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

  return c.json({
    data: { token, user: { id: user.id, name: user.name, email: user.email } },
    message: 'Logged in',
  })
})
