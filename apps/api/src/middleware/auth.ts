import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { createHash } from 'node:crypto'
import { jwtVerify } from 'jose'
import { db } from '@wazap/db'
import { apiKeys, users } from '@wazap/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

const JWT_SECRET = new TextEncoder().encode(process.env['JWT_SECRET'] ?? 'dev_secret')

export interface AuthContext {
  userId: string
  apiKeyId: string
}

declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext
  }
}

export const apiKeyAuth = createMiddleware(async (c, next) => {
  const header = c.req.header('Authorization') ?? ''
  if (!header.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Missing Authorization header' })
  }

  const rawKey = header.slice(7)
  const keyHash = createHash('sha256').update(rawKey).digest('hex')

  const [row] = await db
    .select({ id: apiKeys.id, userId: apiKeys.userId })
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
    .limit(1)

  if (!row) {
    throw new HTTPException(401, { message: 'Invalid or revoked API key' })
  }

  // touch lastUsedAt without blocking the response
  void db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id))

  c.set('auth', { userId: row.userId, apiKeyId: row.id })
  await next()
})

export const jwtAuth = createMiddleware(async (c, next) => {
  const header = c.req.header('Authorization') ?? ''
  if (!header.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Missing Authorization header' })
  }

  const token = header.slice(7)
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const userId = payload['sub']
    if (typeof userId !== 'string') throw new Error('Invalid token')
    c.set('auth', { userId, apiKeyId: '' })
    await next()
  } catch {
    throw new HTTPException(401, { message: 'Invalid or expired token' })
  }
})
