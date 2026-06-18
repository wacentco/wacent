import { Hono } from 'hono'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
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

  return app
}
