import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { jwtVerify } from 'jose'
import { createHash } from 'node:crypto'
import { db } from '@wacent/db'
import { apiKeys } from '@wacent/db/schema'
import { eq, isNull, and } from 'drizzle-orm'

const JWT_SECRET = new TextEncoder().encode(process.env['JWT_SECRET'] ?? '')

export const flexAuth = createMiddleware(async (c, next) => {
  const header = c.req.header('Authorization') ?? ''

  if (!header.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Missing Authorization header' })
  }

  const token = header.slice(7)

  // JWT path — dashboard users
  if (!token.startsWith('wz_')) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      c.set('auth', {
        userId: payload['sub'] as string,
        apiKeyId: '',
      })
      return next()
    } catch {
      throw new HTTPException(401, { message: 'Invalid token' })
    }
  }

  // API key path — external developers
  const keyHash = createHash('sha256').update(token).digest('hex')
  const [apiKey] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
    .limit(1)

  if (!apiKey) {
    throw new HTTPException(401, { message: 'Invalid API key' })
  }

  void db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKey.id))

  c.set('auth', {
    userId: apiKey.userId,
    apiKeyId: apiKey.id,
  })

  return next()
})
