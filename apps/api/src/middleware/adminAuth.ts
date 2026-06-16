import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { jwtVerify } from 'jose'
import { db } from '@wacent/db'
import { users } from '@wacent/db/schema'
import { eq } from 'drizzle-orm'

const JWT_SECRET = new TextEncoder().encode(process.env['JWT_SECRET'] ?? 'dev_secret')

export const adminAuth = createMiddleware(async (c, next) => {
  const header = c.req.header('Authorization') ?? ''
  if (!header.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Missing Authorization header' })
  }

  const token = header.slice(7)
  let userId: string
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const sub = payload['sub']
    if (typeof sub !== 'string') throw new Error('Invalid token')
    userId = sub
  } catch {
    throw new HTTPException(401, { message: 'Invalid or expired token' })
  }

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (user?.role !== 'admin') {
    throw new HTTPException(403, { message: 'Admin access required' })
  }

  c.set('auth', { userId, apiKeyId: '' })
  await next()
})
