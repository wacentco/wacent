import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'
import { Redis } from 'ioredis'
import { rateLimit } from './middleware/ratelimit.js'
import { authRoutes } from './routes/auth.js'
import { apiKeyRoutes } from './routes/api-keys.js'
import { deviceRoutes } from './routes/devices.js'
import { messageRoutes } from './routes/messages.js'
import { campaignRoutes } from './routes/campaigns.js'
import { webhookRoutes } from './routes/webhooks.js'
import { billingRoutes } from './routes/billing.js'
import { analyticsRoutes } from './routes/analytics.js'
import { uploadRoutes } from './routes/upload.js'
import { contactRoutes } from './routes/contacts.js'
import { contactListRoutes } from './routes/contact-lists.js'
import { createWarmDeviceWorker } from './jobs/warmDevice.js'
import { createWarmDeviceQueue } from '@wacent/queue'

const PORT = Number(process.env['PORT'] ?? 8000)
const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379'
const redis = new Redis(REDIS_URL)

const app = new Hono()

app.use(logger())
app.use(cors({ origin: process.env['FRONTEND_URL'] ?? 'http://localhost:3000' }))
app.use('/v1/*', rateLimit(redis))

app.get('/health', (c) => c.json({ status: 'ok' }))

app.route('/v1/auth', authRoutes)
app.route('/v1/api-keys', apiKeyRoutes)
app.route('/v1/devices', deviceRoutes)
app.route('/v1/messages', messageRoutes)
app.route('/v1/campaigns', campaignRoutes)
app.route('/v1/webhooks', webhookRoutes)
app.route('/v1/billing', billingRoutes)
app.route('/v1/analytics', analyticsRoutes)
app.route('/v1/upload', uploadRoutes)
app.route('/v1/contacts', contactRoutes)
app.route('/v1/contact-lists', contactListRoutes)

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: { code: 'HTTP_ERROR', message: err.message } }, err.status)
  }
  console.error(err)
  return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, 500)
})

serve({ fetch: app.fetch, port: PORT }, async () => {
  console.log(`API server running on http://localhost:${PORT}`)

  // Start warm device worker + schedule daily 9 AM cron
  createWarmDeviceWorker()
  const redisConn = { host: new URL(REDIS_URL).hostname, port: Number(new URL(REDIS_URL).port) || 6379 }
  const warmQueue = createWarmDeviceQueue(redisConn)
  await warmQueue.upsertJobScheduler(
    'daily-warm-sweep',
    { pattern: '0 9 * * *' },
    { name: 'sweep', data: { deviceId: '__sweep__', userId: '' } },
  )
  console.log('Warm device cron scheduled (daily 09:00)')
})
