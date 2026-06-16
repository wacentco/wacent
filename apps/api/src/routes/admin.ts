import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '@wacent/db'
import { users, devices, messages, campaigns, subscriptions, plans, spamAlerts } from '@wacent/db/schema'
import { eq, count, and, gte, desc, ilike, or } from 'drizzle-orm'
import { adminAuth } from '../middleware/adminAuth.js'
import { logAudit } from '../lib/audit.js'

const WORKER_URL = process.env['WORKER_URL'] ?? 'http://localhost:3001'
const WORKER_SECRET = process.env['WORKER_SECRET'] ?? ''

const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  plan: z.string().optional(),
  status: z.string().optional(),
  health: z.string().optional(),
  period: z.string().default('30d'),
})

export const adminRoutes = new Hono()

adminRoutes.use(adminAuth)

// GET /admin/overview
adminRoutes.get('/overview', async (c) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    totalUsersRow,
    activeUsersRow,
    newTodayRow,
    newWeekRow,
    totalDevicesRow,
    connectedDevicesRow,
    msgsTodayRow,
  ] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(users).where(gte(users.lastLoginAt, thirtyDaysAgo)),
    db.select({ value: count() }).from(users).where(gte(users.createdAt, today)),
    db.select({ value: count() }).from(users).where(gte(users.createdAt, weekAgo)),
    db.select({ value: count() }).from(devices),
    db.select({ value: count() }).from(devices).where(eq(devices.status, 'connected')),
    db.select({ value: count() }).from(messages).where(
      and(eq(messages.direction, 'outbound'), gte(messages.createdAt, today)),
    ),
  ])

  // MRR: sum active subscriptions × plan price
  const activeSubs = await db
    .select({ planId: subscriptions.planId })
    .from(subscriptions)
    .where(eq(subscriptions.status, 'active'))

  let mrr = 0
  const planBreakdown: Record<string, number> = { starter: 0, growth: 0, scale: 0, agency: 0 }

  for (const sub of activeSubs) {
    const [plan] = await db
      .select({ name: plans.name, priceMonthly: plans.priceMonthly })
      .from(plans)
      .where(eq(plans.id, sub.planId))
      .limit(1)
    if (plan) {
      mrr += plan.priceMonthly
      planBreakdown[plan.name] = (planBreakdown[plan.name] ?? 0) + 1
    }
  }

  return c.json({
    data: {
      mrr,
      arr: mrr * 12,
      totalUsers: totalUsersRow[0]?.value ?? 0,
      activeUsers: activeUsersRow[0]?.value ?? 0,
      newUsersToday: newTodayRow[0]?.value ?? 0,
      newUsersThisWeek: newWeekRow[0]?.value ?? 0,
      totalDevices: totalDevicesRow[0]?.value ?? 0,
      connectedDevices: connectedDevicesRow[0]?.value ?? 0,
      totalMessagesSentToday: msgsTodayRow[0]?.value ?? 0,
      planBreakdown,
    },
    message: 'OK',
  })
})

// GET /admin/users
adminRoutes.get('/users', zValidator('query', pageSchema), async (c) => {
  const { page, limit, search, plan: planFilter, status } = c.req.valid('query')
  const offset = (page - 1) * limit

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      planId: users.planId,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
      suspendedAt: users.suspendedAt,
    })
    .from(users)
    .where(
      search
        ? or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))
        : undefined,
    )
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset)

  return c.json({ data: rows, meta: { page, limit }, message: 'OK' })
})

// GET /admin/users/:id
adminRoutes.get('/users/:id', async (c) => {
  const id = c.req.param('id')

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  if (!user) return c.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, 404)

  const [userDevices, recentMessages, userCampaigns, alerts] = await Promise.all([
    db.select().from(devices).where(eq(devices.userId, id)),
    db.select().from(messages).where(eq(messages.userId, id)).orderBy(desc(messages.createdAt)).limit(20),
    db.select().from(campaigns).where(eq(campaigns.userId, id)).orderBy(desc(campaigns.createdAt)).limit(10),
    db.select().from(spamAlerts).where(eq(spamAlerts.userId, id)).orderBy(desc(spamAlerts.createdAt)).limit(10),
  ])

  return c.json({
    data: { user, devices: userDevices, recentMessages, campaigns: userCampaigns, spamAlerts: alerts },
    message: 'OK',
  })
})

// POST /admin/users/:id/suspend
adminRoutes.post('/users/:id/suspend', zValidator('json', z.object({ reason: z.string().min(1) })), async (c) => {
  const { userId: adminId } = c.get('auth')
  const id = c.req.param('id')
  const { reason } = c.req.valid('json')

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1)
  if (!user) return c.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, 404)

  await db
    .update(users)
    .set({ suspendedAt: new Date(), suspendReason: reason, updatedAt: new Date() })
    .where(eq(users.id, id))

  // Disconnect all devices
  const userDevices = await db.select({ id: devices.id }).from(devices).where(eq(devices.userId, id))
  for (const device of userDevices) {
    void fetch(`${WORKER_URL}/internal/sessions/${device.id}/stop`, {
      method: 'POST',
      headers: { 'X-Worker-Secret': WORKER_SECRET },
    })
  }

  await logAudit({ userId: adminId, action: 'USER_SUSPEND', resource: 'user', resourceId: id, metadata: { reason } })

  return c.json({ data: null, message: 'User suspended' })
})

// POST /admin/users/:id/unsuspend
adminRoutes.post('/users/:id/unsuspend', async (c) => {
  const { userId: adminId } = c.get('auth')
  const id = c.req.param('id')

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1)
  if (!user) return c.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, 404)

  await db
    .update(users)
    .set({ suspendedAt: null, suspendReason: null, updatedAt: new Date() })
    .where(eq(users.id, id))

  await logAudit({ userId: adminId, action: 'USER_UNSUSPEND', resource: 'user', resourceId: id })

  return c.json({ data: null, message: 'User unsuspended' })
})

// GET /admin/devices
adminRoutes.get('/devices', zValidator('query', pageSchema), async (c) => {
  const { page, limit, status, health } = c.req.valid('query')
  const offset = (page - 1) * limit

  const rows = await db
    .select()
    .from(devices)
    .where(status ? eq(devices.status, status) : undefined)
    .orderBy(desc(devices.createdAt))
    .limit(limit)
    .offset(offset)

  return c.json({ data: rows, meta: { page, limit }, message: 'OK' })
})

// GET /admin/revenue
adminRoutes.get('/revenue', async (c) => {
  const days = 30

  // Simple placeholder — actual revenue chart requires grouping by date
  const activeSubs = await db
    .select({ planId: subscriptions.planId, currentPeriodStart: subscriptions.currentPeriodStart })
    .from(subscriptions)
    .where(eq(subscriptions.status, 'active'))

  let totalRevenue = 0
  const revenueByPlan: Record<string, number> = {}

  for (const sub of activeSubs) {
    const [plan] = await db
      .select({ name: plans.name, priceMonthly: plans.priceMonthly })
      .from(plans)
      .where(eq(plans.id, sub.planId))
      .limit(1)
    if (plan) {
      totalRevenue += plan.priceMonthly
      revenueByPlan[plan.name] = (revenueByPlan[plan.name] ?? 0) + plan.priceMonthly
    }
  }

  return c.json({
    data: {
      totalRevenue,
      revenueByPlan,
      mrr: totalRevenue,
      mrrGrowth: 0,
      newMrr: 0,
      churnedMrr: 0,
      period: `${days}d`,
    },
    message: 'OK',
  })
})

// GET /admin/spam-alerts
adminRoutes.get('/spam-alerts', zValidator('query', pageSchema), async (c) => {
  const { page, limit } = c.req.valid('query')

  const rows = await db
    .select()
    .from(spamAlerts)
    .orderBy(desc(spamAlerts.createdAt))
    .limit(limit)
    .offset((page - 1) * limit)

  return c.json({ data: rows, meta: { page, limit }, message: 'OK' })
})

// GET /admin/system
adminRoutes.get('/system', async (c) => {
  const [totalMsgs, totalDevices, totalUsers] = await Promise.all([
    db.select({ value: count() }).from(messages),
    db.select({ value: count() }).from(devices),
    db.select({ value: count() }).from(users),
  ])

  return c.json({
    data: {
      totalMessages: totalMsgs[0]?.value ?? 0,
      totalDevices: totalDevices[0]?.value ?? 0,
      totalUsers: totalUsers[0]?.value ?? 0,
      uptime: `${Math.floor(process.uptime())}s`,
    },
    message: 'OK',
  })
})
