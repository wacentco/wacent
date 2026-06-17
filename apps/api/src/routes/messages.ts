import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Redis } from 'ioredis'
import { db } from '@wacent/db'
import { messages, devices } from '@wacent/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { SendMessageSchema } from '@wacent/types'
import { createSendMessageQueue } from '@wacent/queue'
import { flexAuth } from '../middleware/flexAuth.js'
import { spamDetect } from '../middleware/spamDetect.js'

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379'
const redis = new Redis(REDIS_URL)
const sendMessageQueue = createSendMessageQueue({ host: new URL(REDIS_URL).hostname, port: Number(new URL(REDIS_URL).port) || 6379 })

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const messageRoutes = new Hono()

messageRoutes.use(flexAuth)

messageRoutes.post('/send', spamDetect(redis), zValidator('json', SendMessageSchema), async (c) => {
  const { userId } = c.get('auth')
  const input = c.req.valid('json')

  // Verify device belongs to user
  const [device] = await db
    .select({ id: devices.id, status: devices.status })
    .from(devices)
    .where(and(eq(devices.id, input.whatsapp_account_id), eq(devices.userId, userId)))
    .limit(1)

  if (!device) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Device not found' } }, 404)
  }
  if (device.status !== 'connected') {
    return c.json({ error: { code: 'DEVICE_OFFLINE', message: 'Device is not connected' } }, 422)
  }

  const [message] = await db
    .insert(messages)
    .values({
      userId,
      deviceId: input.whatsapp_account_id,
      direction: 'outbound',
      toNumber: input.phone_number,
      type: input.type,
      content: input.content ?? null,
      mediaUrl: input.media_url ?? null,
      caption: input.caption ?? null,
      status: 'queued',
    })
    .returning({ id: messages.id, status: messages.status, createdAt: messages.createdAt })

  if (!message) {
    return c.json({ error: { code: 'CREATE_FAILED', message: 'Failed to create message' } }, 500)
  }

  await sendMessageQueue.add('send', {
    messageId: message.id,
    userId,
    deviceId: input.whatsapp_account_id,
    toNumber: input.phone_number,
    type: input.type,
    content: input.content,
    mediaUrl: input.media_url,
    caption: input.caption,
    campaignId: undefined,
  })

  return c.json({ data: { message_id: message.id, status: message.status, created_at: message.createdAt } }, 202)
})

messageRoutes.get('/', zValidator('query', listQuerySchema), async (c) => {
  const { userId } = c.get('auth')
  const { page, limit } = c.req.valid('query')
  const offset = (page - 1) * limit

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.userId, userId))
    .orderBy(desc(messages.createdAt))
    .limit(limit)
    .offset(offset)

  return c.json({ data: rows, meta: { page, limit }, message: 'OK' })
})

messageRoutes.get('/:id', async (c) => {
  const { userId } = c.get('auth')
  const id = c.req.param('id')

  const [message] = await db
    .select()
    .from(messages)
    .where(and(eq(messages.id, id), eq(messages.userId, userId)))
    .limit(1)

  if (!message) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Message not found' } }, 404)
  }

  return c.json({ data: message, message: 'OK' })
})
