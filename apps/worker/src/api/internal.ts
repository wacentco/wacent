import { Hono } from 'hono'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { db } from '@wacent/db'
import { messages } from '@wacent/db/schema'
import { eq } from 'drizzle-orm'
import { createProcessCampaignQueue } from '@wacent/queue'
import { bullMQConnection } from '../redis/client.js'
import type { SessionManager } from '../sessions/SessionManager.js'

const WORKER_SECRET = process.env['WORKER_SECRET'] ?? ''

const workerAuth = createMiddleware(async (c, next) => {
  if (c.req.header('X-Worker-Secret') !== WORKER_SECRET) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }
  await next()
})

export function createInternalApi(manager: SessionManager) {
  const app = new Hono()

  app.use(workerAuth)

  app.post('/internal/sessions/:deviceId/start', async (c) => {
    const { deviceId } = c.req.param()
    await manager.startSession(deviceId)
    return c.json({ data: { deviceId, status: 'starting' }, message: 'Session starting' })
  })

  app.post('/internal/sessions/:deviceId/stop', async (c) => {
    const { deviceId } = c.req.param()
    await manager.stopSession(deviceId)
    return c.json({ data: { deviceId, status: 'stopped' }, message: 'Session stopped' })
  })

  app.post('/internal/sessions/:deviceId/send', async (c) => {
    const { deviceId } = c.req.param()
    const body = await c.req.json<{
      to: string
      type: string
      content: string | undefined
      mediaUrl: string | undefined
      caption: string | undefined
    }>()

    const waMessageId = await manager.sendMessage(deviceId, body.to, body)
    return c.json({ data: { waMessageId }, message: 'Sent' })
  })

  app.get('/internal/sessions/:deviceId/status', (c) => {
    const { deviceId } = c.req.param()
    const status = manager.getStatus(deviceId)
    return c.json({ data: { deviceId, status }, message: 'OK' })
  })

  app.get('/internal/sessions/:deviceId/qr', (c) => {
    const { deviceId } = c.req.param()
    const qr = manager.getQR(deviceId)
    return c.json({ data: { deviceId, qr }, message: 'OK' })
  })

  app.delete('/internal/sessions/:deviceId/data', async (c) => {
    const { deviceId } = c.req.param()
    await manager.deleteSessionData(deviceId)
    return c.json({ data: { deviceId, deleted: true }, message: 'Session data deleted' })
  })

  // Direct job trigger: send a single message (no BullMQ queue — called from apps/api)
  app.post('/internal/jobs/send-message', async (c) => {
    const body = await c.req.json<{
      messageId: string
      userId: string
      deviceId: string
      toNumber: string
      type: string
      content?: string
      mediaUrl?: string
      caption?: string
    }>()

    const { messageId, deviceId, toNumber, type, content, mediaUrl, caption } = body
    console.log(`[Job:send-message] messageId=${messageId} deviceId=${deviceId} to=${toNumber}`)

    try {
      const waMessageId = await manager.sendMessage(deviceId, toNumber, { type, content, mediaUrl, caption })
      await db
        .update(messages)
        .set({ status: 'sent', waMessageId, sentAt: new Date(), updatedAt: new Date() })
        .where(eq(messages.id, messageId))
      return c.json({ data: { success: true, waMessageId }, message: 'Sent' })
    } catch (err) {
      console.error(`[Job:send-message] Failed messageId=${messageId}:`, err)
      await db
        .update(messages)
        .set({
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : 'Send failed',
          updatedAt: new Date(),
        })
        .where(eq(messages.id, messageId))
      throw new HTTPException(500, { message: err instanceof Error ? err.message : 'Send failed' })
    }
  })

  // Direct job trigger: start campaign processing (enqueues to BullMQ internally)
  app.post('/internal/jobs/process-campaign', async (c) => {
    const body = await c.req.json<{
      campaignId: string
      userId: string
      batchOffset: number
    }>()

    const queue = createProcessCampaignQueue(bullMQConnection)
    await queue.add('process', { campaignId: body.campaignId, userId: body.userId, batchOffset: body.batchOffset ?? 0 })
    console.log(`[Job:process-campaign] Enqueued campaignId=${body.campaignId}`)

    return c.json({ data: { success: true }, message: 'Campaign processing enqueued' })
  })

  return app
}
