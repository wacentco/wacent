import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'
import { redis, bullMQConnection } from './redis/client.js'
import { SessionManager } from './sessions/SessionManager.js'
import { createInternalApi } from './api/internal.js'
import { createSendMessageWorker } from './jobs/sendMessage.js'
import { createDeliverWebhookWorker } from './jobs/deliverWebhook.js'
import { createProcessCampaignWorker } from './jobs/processCampaign.js'
import { createWarmDeviceWorker } from './jobs/warmDevice.js'
import { createHealthCheckWorker, resetDailyCounters } from './jobs/healthCheck.js'
import { createWarmDeviceQueue, createHealthCheckQueue } from '@wacent/queue'

const PORT = Number(process.env['PORT'] ?? 3001)
const manager = new SessionManager(redis)

// BullMQ workers
createSendMessageWorker(manager)
createDeliverWebhookWorker()
createProcessCampaignWorker(manager)
createWarmDeviceWorker(manager)
createHealthCheckWorker()

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

serve({ fetch: app.fetch, port: PORT }, async () => {
  console.log(`Worker server running on http://localhost:${PORT}`)

  // Warm device: daily 09:00 UTC
  const warmQueue = createWarmDeviceQueue(bullMQConnection)
  await warmQueue.upsertJobScheduler(
    'daily-warm-sweep',
    { pattern: '0 9 * * *' },
    { name: 'sweep', data: { deviceId: '__sweep__', userId: '' } },
  )

  // Health check: hourly + daily counter reset at midnight UTC
  const healthQueue = createHealthCheckQueue(bullMQConnection)
  await healthQueue.upsertJobScheduler('hourly-health-check', { pattern: '0 * * * *' }, { name: 'check', data: {} })
  await healthQueue.upsertJobScheduler('midnight-reset', { pattern: '0 0 * * *' }, { name: 'reset', data: {} })

  console.log('Workers and crons initialized')
})
