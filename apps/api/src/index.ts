import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'
import { redis, redisConn } from './lib/redis.js'
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
import { privacyRoutes } from './routes/privacy.js'
import { adminRoutes } from './routes/admin.js'
import { createWarmDeviceWorker } from './jobs/warmDevice.js'
import { createHealthCheckWorker, resetDailyCounters } from './jobs/healthCheck.js'
import { createProcessCampaignWorker } from './jobs/processCampaign.js'
import { createWarmDeviceQueue, createHealthCheckQueue } from '@wacent/queue'

const PORT = Number(process.env['PORT'] ?? 8000)

const app = new Hono()

app.use(logger())
app.use('*', cors({
  origin: [
    'http://localhost:3000',
    'https://wacent-web.vercel.app',
    process.env['FRONTEND_URL'] ?? '',
  ],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}))
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
app.route('/v1/privacy', privacyRoutes)
app.route('/admin', adminRoutes)

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: { code: 'HTTP_ERROR', message: err.message } }, err.status)
  }
  console.error(err)
  return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, 500)
})

serve({ fetch: app.fetch, port: PORT }, async () => {
  console.log(`API server running on http://localhost:${PORT}`)

  // Warm device: daily 09:00 UTC
  createWarmDeviceWorker()
  const warmQueue = createWarmDeviceQueue(redisConn)
  await warmQueue.upsertJobScheduler(
    'daily-warm-sweep',
    { pattern: '0 9 * * *' },
    { name: 'sweep', data: { deviceId: '__sweep__', userId: '' } },
  )

  // Health check: hourly + daily counter reset at midnight UTC
  createHealthCheckWorker()
  const healthQueue = createHealthCheckQueue(redisConn)
  await healthQueue.upsertJobScheduler('hourly-health-check', { pattern: '0 * * * *' }, { name: 'check', data: {} })
  await healthQueue.upsertJobScheduler('midnight-reset', { pattern: '0 0 * * *' }, { name: 'reset', data: {} })

  // Campaign processor
  createProcessCampaignWorker()

  console.log('Workers and crons initialized')
})
