import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { createHash, randomBytes } from 'node:crypto'
import { db } from '@wacent/db'
import { apiKeys } from '@wacent/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { apiKeyAuth } from '../middleware/auth.js'

const createSchema = z.object({ name: z.string().min(1).max(255) })

export const apiKeyRoutes = new Hono()

apiKeyRoutes.use(apiKeyAuth)

apiKeyRoutes.get('/', async (c) => {
  const { userId } = c.get('auth')
  const rows = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.prefix,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))

  return c.json({ data: rows, message: 'OK' })
})

apiKeyRoutes.post('/', zValidator('json', createSchema), async (c) => {
  const { userId } = c.get('auth')
  const { name } = c.req.valid('json')

  const raw = `wz_live_${randomBytes(24).toString('hex')}`
  const prefix = raw.slice(0, 12)
  const keyHash = createHash('sha256').update(raw).digest('hex')

  const [row] = await db
    .insert(apiKeys)
    .values({ userId, name, keyHash, prefix })
    .returning({ id: apiKeys.id, name: apiKeys.name, prefix: apiKeys.prefix, createdAt: apiKeys.createdAt })

  // Return plaintext key once — never stored
  return c.json({ data: { ...row, key: raw }, message: 'API key created. Save it now — it will not be shown again.' }, 201)
})

apiKeyRoutes.delete('/:id', async (c) => {
  const { userId } = c.get('auth')
  const id = c.req.param('id')

  const [row] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
    .returning({ id: apiKeys.id })

  if (!row) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'API key not found' } }, 404)
  }

  return c.json({ data: { id: row.id }, message: 'API key revoked' })
})
