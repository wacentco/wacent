import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'
import { redis, bullMQConnection } from './redis/client.js'
import { SessionManager } from './sessions/SessionManager.js'
import { createInternalApi } from './api/internal.js'
import { createSendMessageQueue, QUEUE_NAMES } from '@wacent/queue'
import { Worker } from 'bullmq'
import { db } from '@wacent/db'
import { messages } from '@wacent/db/schema'
import { eq } from 'drizzle-orm'
import type { SendMessageJobData } from '@wacent/queue'

const PORT = Number(process.env['PORT'] ?? 3001)
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
    connection: bullMQConnection,
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
