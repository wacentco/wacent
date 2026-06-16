import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { createHash, createHmac } from 'node:crypto'
import { db } from '@wazap/db'
import { webhooks, webhookLogs } from '@wazap/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { CreateWebhookSchema, UpdateWebhookSchema } from '@wazap/types'
import { apiKeyAuth } from '../middleware/auth.js'

const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const webhookRoutes = new Hono()

webhookRoutes.use(apiKeyAuth)

webhookRoutes.get('/', async (c) => {
  const { userId } = c.get('auth')
  const rows = await db
    .select({
      id: webhooks.id,
      url: webhooks.url,
      events: webhooks.events,
      isActive: webhooks.isActive,
      failureCount: webhooks.failureCount,
      lastTriggeredAt: webhooks.lastTriggeredAt,
      createdAt: webhooks.createdAt,
      updatedAt: webhooks.updatedAt,
    })
    .from(webhooks)
    .where(eq(webhooks.userId, userId))
    .orderBy(desc(webhooks.createdAt))

  return c.json({ data: rows, message: 'OK' })
})

webhookRoutes.post('/', zValidator('json', CreateWebhookSchema), async (c) => {
  const { userId } = c.get('auth')
  const { url, events, secret } = c.req.valid('json')

  const secretHash = createHash('sha256').update(secret).digest('hex')

  const [webhook] = await db
    .insert(webhooks)
    .values({ userId, url, events, secretHash, isActive: true })
    .returning({
      id: webhooks.id,
      url: webhooks.url,
      events: webhooks.events,
      isActive: webhooks.isActive,
      createdAt: webhooks.createdAt,
    })

  return c.json({ data: webhook, message: 'Created' }, 201)
})

webhookRoutes.put('/:id', zValidator('json', UpdateWebhookSchema), async (c) => {
  const { userId } = c.get('auth')
  const id = c.req.param('id')
  const input = c.req.valid('json')

  const [existing] = await db
    .select({ id: webhooks.id })
    .from(webhooks)
    .where(and(eq(webhooks.id, id), eq(webhooks.userId, userId)))
    .limit(1)

  if (!existing) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Webhook not found' } }, 404)
  }

  const updates: Partial<typeof webhooks.$inferInsert> = { updatedAt: new Date() }
  if (input.url) updates.url = input.url
  if (input.events) updates.events = input.events
  if (input.secret) updates.secretHash = createHash('sha256').update(input.secret).digest('hex')

  const [updated] = await db.update(webhooks).set(updates).where(eq(webhooks.id, id)).returning()
  return c.json({ data: updated, message: 'Updated' })
})

webhookRoutes.delete('/:id', async (c) => {
  const { userId } = c.get('auth')
  const id = c.req.param('id')

  const [existing] = await db
    .select({ id: webhooks.id })
    .from(webhooks)
    .where(and(eq(webhooks.id, id), eq(webhooks.userId, userId)))
    .limit(1)

  if (!existing) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Webhook not found' } }, 404)
  }

  await db.delete(webhooks).where(eq(webhooks.id, id))
  return c.json({ data: null, message: 'Deleted' })
})

webhookRoutes.get('/:id/logs', zValidator('query', pageSchema), async (c) => {
  const { userId } = c.get('auth')
  const id = c.req.param('id')
  const { page, limit } = c.req.valid('query')

  const [webhook] = await db
    .select({ id: webhooks.id })
    .from(webhooks)
    .where(and(eq(webhooks.id, id), eq(webhooks.userId, userId)))
    .limit(1)

  if (!webhook) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Webhook not found' } }, 404)
  }

  const logs = await db
    .select()
    .from(webhookLogs)
    .where(eq(webhookLogs.webhookId, id))
    .orderBy(desc(webhookLogs.createdAt))
    .limit(limit)
    .offset((page - 1) * limit)

  return c.json({ data: logs, meta: { page, limit }, message: 'OK' })
})

webhookRoutes.post('/:id/test', async (c) => {
  const { userId } = c.get('auth')
  const id = c.req.param('id')

  const [webhook] = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.id, id), eq(webhooks.userId, userId)))
    .limit(1)

  if (!webhook) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Webhook not found' } }, 404)
  }

  const payload = {
    event: 'message.sent',
    timestamp: new Date().toISOString(),
    data: { test: true, message: 'This is a test event from Wazap' },
  }
  const body = JSON.stringify(payload)
  const signature = `sha256=${createHmac('sha256', webhook.secretHash).update(body).digest('hex')}`

  let responseStatus: number | null = null
  let responseBody: string | null = null
  try {
    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Wazap-Signature': signature },
      body,
      signal: AbortSignal.timeout(10000),
    })
    responseStatus = res.status
    responseBody = await res.text()
  } catch (err) {
    responseBody = err instanceof Error ? err.message : 'Request failed'
  }

  await db.insert(webhookLogs).values({
    webhookId: id,
    eventType: 'message.sent',
    payload,
    responseStatus,
    responseBody,
    deliveredAt: responseStatus && responseStatus < 400 ? new Date() : null,
  })

  return c.json({ data: { status: responseStatus, body: responseBody }, message: 'Test sent' })
})
