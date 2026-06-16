import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { sql } from 'drizzle-orm'
import { db } from '@wazap/db'
import { messages, devices } from '@wazap/db/schema'
import { eq, and, gte, count } from 'drizzle-orm'
import { jwtAuth } from '../middleware/auth.js'

const rangeSchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
})

export const analyticsRoutes = new Hono()

analyticsRoutes.use(jwtAuth)

analyticsRoutes.get('/overview', zValidator('query', rangeSchema), async (c) => {
  const { userId } = c.get('auth')
  const { days } = c.req.valid('query')
  const since = new Date(Date.now() - days * 86400_000)

  const [totals] = await db
    .select({
      sent: sql<number>`count(*) filter (where ${messages.direction} = 'outbound' and ${messages.status} in ('sent','delivered','read','failed'))`.mapWith(Number),
      delivered: sql<number>`count(*) filter (where ${messages.status} = 'delivered' or ${messages.status} = 'read')`.mapWith(Number),
      read: sql<number>`count(*) filter (where ${messages.status} = 'read')`.mapWith(Number),
      failed: sql<number>`count(*) filter (where ${messages.status} = 'failed')`.mapWith(Number),
      received: sql<number>`count(*) filter (where ${messages.direction} = 'inbound')`.mapWith(Number),
    })
    .from(messages)
    .where(and(eq(messages.userId, userId), gte(messages.createdAt, since)))

  const [deviceStats] = await db
    .select({ total: count(), active: sql<number>`count(*) filter (where ${devices.status} = 'connected')`.mapWith(Number) })
    .from(devices)
    .where(eq(devices.userId, userId))

  const sent = totals?.sent ?? 0
  const delivered = totals?.delivered ?? 0
  const read = totals?.read ?? 0

  return c.json({
    data: {
      sent,
      delivered,
      read,
      failed: totals?.failed ?? 0,
      received: totals?.received ?? 0,
      deliveryRate: sent > 0 ? Math.round((delivered / sent) * 1000) / 10 : 0,
      readRate: delivered > 0 ? Math.round((read / delivered) * 1000) / 10 : 0,
      totalDevices: deviceStats?.total ?? 0,
      activeDevices: deviceStats?.active ?? 0,
      periodDays: days,
    },
    message: 'OK',
  })
})

analyticsRoutes.get('/messages', zValidator('query', rangeSchema), async (c) => {
  const { userId } = c.get('auth')
  const { days } = c.req.valid('query')
  const since = new Date(Date.now() - days * 86400_000)

  const rows = await db
    .select({
      date: sql<string>`date(${messages.createdAt})`.mapWith(String),
      sent: sql<number>`count(*) filter (where ${messages.direction} = 'outbound')`.mapWith(Number),
      delivered: sql<number>`count(*) filter (where ${messages.status} in ('delivered','read'))`.mapWith(Number),
      read: sql<number>`count(*) filter (where ${messages.status} = 'read')`.mapWith(Number),
      failed: sql<number>`count(*) filter (where ${messages.status} = 'failed')`.mapWith(Number),
      received: sql<number>`count(*) filter (where ${messages.direction} = 'inbound')`.mapWith(Number),
    })
    .from(messages)
    .where(and(eq(messages.userId, userId), gte(messages.createdAt, since)))
    .groupBy(sql`date(${messages.createdAt})`)
    .orderBy(sql`date(${messages.createdAt})`)

  return c.json({ data: rows, message: 'OK' })
})

analyticsRoutes.get('/devices', async (c) => {
  const { userId } = c.get('auth')
  const since = new Date(Date.now() - 30 * 86400_000)

  const rows = await db
    .select({
      deviceId: messages.deviceId,
      deviceName: devices.name,
      phoneNumber: devices.phoneNumber,
      status: devices.status,
      sent: sql<number>`count(*) filter (where ${messages.direction} = 'outbound')`.mapWith(Number),
      delivered: sql<number>`count(*) filter (where ${messages.status} in ('delivered','read'))`.mapWith(Number),
      failed: sql<number>`count(*) filter (where ${messages.status} = 'failed')`.mapWith(Number),
      received: sql<number>`count(*) filter (where ${messages.direction} = 'inbound')`.mapWith(Number),
    })
    .from(messages)
    .innerJoin(devices, eq(devices.id, messages.deviceId))
    .where(and(eq(messages.userId, userId), gte(messages.createdAt, since)))
    .groupBy(messages.deviceId, devices.name, devices.phoneNumber, devices.status)

  return c.json({ data: rows, message: 'OK' })
})
