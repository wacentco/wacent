import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '@wacent/db'
import { campaigns, campaignRecipients, devices, messages, spamAlerts, usageLogs } from '@wacent/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { CreateDeviceSchema } from '@wacent/types'
import { flexAuth } from '../middleware/flexAuth.js'
import { planGuard } from '../middleware/planGuard.js'

const patchDeviceSchema = z.object({
  autoWarm: z.boolean().optional(),
  name: z.string().min(1).max(255).optional(),
})

const WORKER_URL = process.env['WORKER_URL'] ?? 'http://localhost:3001'
const WORKER_SECRET = process.env['WORKER_SECRET'] ?? ''

async function workerPost(path: string, body?: object) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Worker-Secret': WORKER_SECRET },
    signal: controller.signal,
  }

  if (body !== undefined) {
    init.body = JSON.stringify(body)
  }

  try {
    const res = await fetch(`${WORKER_URL}${path}`, init)
    return res
  } catch (err) {
    console.error(`Worker call failed for ${path}:`, err)
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

async function workerGet(path: string) {
  return fetch(`${WORKER_URL}${path}`, {
    headers: { 'X-Worker-Secret': WORKER_SECRET },
  })
}

export const deviceRoutes = new Hono()

deviceRoutes.use(flexAuth)

deviceRoutes.get('/', async (c) => {
  const { userId } = c.get('auth')
  const rows = await db
    .select({
      id: devices.id,
      name: devices.name,
      phoneNumber: devices.phoneNumber,
      status: devices.status,
      autoWarm: devices.autoWarm,
      warmProgress: devices.warmProgress,
      lastSeenAt: devices.lastSeenAt,
      connectedAt: devices.connectedAt,
      createdAt: devices.createdAt,
    })
    .from(devices)
    .where(eq(devices.userId, userId))

  return c.json({ data: rows, message: 'OK' })
})

deviceRoutes.post('/', planGuard, zValidator('json', CreateDeviceSchema), async (c) => {
  const { userId } = c.get('auth')
  const { name, autoWarm } = c.req.valid('json')

  const [device] = await db
    .insert(devices)
    .values({ userId, name, autoWarm: autoWarm ?? false })
    .returning({
      id: devices.id,
      name: devices.name,
      status: devices.status,
      autoWarm: devices.autoWarm,
      createdAt: devices.createdAt,
    })

  if (!device) {
    return c.json({ error: { code: 'CREATE_FAILED', message: 'Failed to create device' } }, 500)
  }

  workerPost(`/internal/sessions/${device.id}/start`).catch((err) =>
    console.warn('Worker start failed (non-critical):', err),
  )

  return c.json({ data: device, message: 'Device created. Scan QR to connect.' }, 201)
})

deviceRoutes.get('/:id', async (c) => {
  const { userId } = c.get('auth')
  const id = c.req.param('id')

  const [device] = await db
    .select()
    .from(devices)
    .where(and(eq(devices.id, id), eq(devices.userId, userId)))
    .limit(1)

  if (!device) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Device not found' } }, 404)
  }

  return c.json({ data: device, message: 'OK' })
})

deviceRoutes.get('/:id/qr', async (c) => {
  const { userId } = c.get('auth')
  const id = c.req.param('id')

  const [device] = await db
    .select({ id: devices.id, qrCode: devices.qrCode, status: devices.status })
    .from(devices)
    .where(and(eq(devices.id, id), eq(devices.userId, userId)))
    .limit(1)

  if (!device) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Device not found' } }, 404)
  }

  return c.json({ data: { deviceId: device.id, qrCode: device.qrCode, status: device.status }, message: 'OK' })
})

deviceRoutes.post('/:id/disconnect', async (c) => {
  const { userId } = c.get('auth')
  const id = c.req.param('id')

  const [device] = await db
    .select({ id: devices.id })
    .from(devices)
    .where(and(eq(devices.id, id), eq(devices.userId, userId)))
    .limit(1)

  if (!device) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Device not found' } }, 404)
  }

  try {
    await workerPost(`/internal/sessions/${id}/stop`)
  } catch (err) {
    console.warn('Worker stop failed (non-critical):', err)
  }
  await db.update(devices).set({ status: 'disconnected' }).where(eq(devices.id, id))

  return c.json({ data: { id }, message: 'Device disconnected' })
})

deviceRoutes.post('/:id/reconnect', async (c) => {
  const { userId } = c.get('auth')
  const id = c.req.param('id')

  const [device] = await db
    .select({ id: devices.id })
    .from(devices)
    .where(and(eq(devices.id, id), eq(devices.userId, userId)))
    .limit(1)

  if (!device) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Device not found' } }, 404)
  }

  workerPost(`/internal/sessions/${id}/start`).catch((err) =>
    console.warn('Worker start failed (non-critical):', err),
  )

  return c.json({ data: { id }, message: 'Reconnecting...' })
})

deviceRoutes.patch('/:id', zValidator('json', patchDeviceSchema), async (c) => {
  const { userId } = c.get('auth')
  const id = c.req.param('id')
  const input = c.req.valid('json')

  const [existing] = await db
    .select({ id: devices.id, warmProgress: devices.warmProgress })
    .from(devices)
    .where(and(eq(devices.id, id), eq(devices.userId, userId)))
    .limit(1)

  if (!existing) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Device not found' } }, 404)
  }

  const updates: Partial<typeof devices.$inferInsert> = { updatedAt: new Date() }
  if (input.name !== undefined) updates.name = input.name
  if (input.autoWarm !== undefined) {
    updates.autoWarm = input.autoWarm
    // Reset progress when toggling warm back on from 0
    if (input.autoWarm && existing.warmProgress === 100) updates.warmProgress = 0
  }

  const [updated] = await db.update(devices).set(updates).where(eq(devices.id, id)).returning({
    id: devices.id,
    name: devices.name,
    autoWarm: devices.autoWarm,
    warmProgress: devices.warmProgress,
  })

  return c.json({ data: updated, message: 'Updated' })
})

deviceRoutes.delete('/:id', async (c) => {
  const { userId } = c.get('auth')
  const id = c.req.param('id')

  const [device] = await db
    .select({ id: devices.id })
    .from(devices)
    .where(and(eq(devices.id, id), eq(devices.userId, userId)))
    .limit(1)

  if (!device) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Device not found' } }, 404)
  }

  try {
    await workerPost(`/internal/sessions/${id}/stop`)
  } catch (err) {
    console.warn('Worker stop failed during delete, continuing:', err)
  }

  // Cascade delete in FK-safe order
  const deviceCampaigns = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(eq(campaigns.deviceId, id))

  const campaignIds = deviceCampaigns.map((c) => c.id)

  if (campaignIds.length > 0) {
    await db.delete(campaignRecipients).where(inArray(campaignRecipients.campaignId, campaignIds))
  }
  await db.delete(messages).where(eq(messages.deviceId, id))
  await db.delete(campaigns).where(eq(campaigns.deviceId, id))
  await db.delete(spamAlerts).where(eq(spamAlerts.deviceId, id))
  await db.delete(usageLogs).where(eq(usageLogs.deviceId, id))
  await db.delete(devices).where(eq(devices.id, id))

  return c.json({ data: { id }, message: 'Device deleted' })
})
