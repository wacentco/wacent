import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'
import { Redis } from 'ioredis'
import { SessionManager } from './sessions/SessionManager.js'
import { createInternalApi } from './api/internal.js'
import { createSendMessageQueue, QUEUE_NAMES } from '@wacent/queue'
import { Worker } from 'bullmq'
import { db } from '@wacent/db'
import { messages } from '@wacent/db/schema'
import { eq } from 'drizzle-orm'
import type { SendMessageJobData } from '@wacent/queue'

const PORT = Number(process.env['PORT'] ?? 3001)
const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379'
const redisUrl = new URL(REDIS_URL)
const isTLS = REDIS_URL.startsWith('rediss://')
const tlsOptions = isTLS ? { tls: { rejectUnauthorized: false } } : {}

const redis = new Redis(REDIS_URL, {
  ...tlsOptions,
  retryStrategy: (times) => {
    if (times > 3) return null
    return Math.min(times * 200, 1000)
  },
})

const redisConn = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port) || 6379,
  ...tlsOptions,
}
const manager = new SessionManager(redis)

// Process send-message jobs
new Worker<SendMessageJobData>(
  QUEUE_NAMES.SEND_MESSAGE,
  async (job: import('bullmq').Job<SendMessageJobData>) => {
    const { messageId, deviceId, toNumber, type, content, mediaUrl, caption } = job.data

    const waMessageId = await manager.sendMessage(deviceId, toNumber, { type, content, mediaUrl, caption })

    await db
      .update(messages)
      .set({ status: 'sent', waMessageId, sentAt: new Date() })
      .where(eq(messages.id, messageId))
  },
  {
    connection: redisConn,
    concurrency: 5,
  },
)

const app = new Hono()
app.use(logger())
app.get('/health', (c) => c.json({ status: 'ok' }))
app.route('/', createInternalApi(manager))

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: { code: 'HTTP_ERROR', message: err.message } }, err.status)
  }
  console.error(err)
  return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, 500)
})

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Worker server running on http://localhost:${PORT}`)
})
