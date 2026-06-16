import { Hono } from 'hono'
import { db } from '@wacent/db'
import { users, devices, messages, campaigns, contacts, apiKeys, webhooks, auditLogs } from '@wacent/db/schema'
import { eq, desc } from 'drizzle-orm'
import { jwtAuth } from '../middleware/auth.js'
import { logAudit } from '../lib/audit.js'

export const privacyRoutes = new Hono()

privacyRoutes.use(jwtAuth)

privacyRoutes.get('/export', async (c) => {
  const { userId } = c.get('auth')
  const ip = c.req.header('x-forwarded-for')

  const [user, userDevices, userMessages, userCampaigns, userContacts] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).limit(1),
    db.select().from(devices).where(eq(devices.userId, userId)),
    db.select().from(messages).where(eq(messages.userId, userId)).limit(1000),
    db.select().from(campaigns).where(eq(campaigns.userId, userId)),
    db.select().from(contacts).where(eq(contacts.userId, userId)),
  ])

  await logAudit({ userId, action: 'DATA_EXPORT', resource: 'user', resourceId: userId, ...(ip ? { ipAddress: ip } : {}) })

  return c.json({
    data: {
      profile: user[0] ?? null,
      devices: userDevices,
      messages: userMessages,
      campaigns: userCampaigns,
      contacts: userContacts,
    },
    message: 'Export complete',
  })
})

privacyRoutes.delete('/account', async (c) => {
  const { userId } = c.get('auth')
  const ip = c.req.header('x-forwarded-for')

  // Soft delete — mark suspended, hard delete scheduled externally after 30 days
  await db
    .update(users)
    .set({ suspendedAt: new Date(), suspendReason: 'GDPR_DELETION_REQUEST', updatedAt: new Date() })
    .where(eq(users.id, userId))

  // Revoke all API keys immediately
  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(eq(apiKeys.userId, userId))

  await logAudit({ userId, action: 'ACCOUNT_DELETE_REQUESTED', resource: 'user', resourceId: userId, ...(ip ? { ipAddress: ip } : {}) })

  return c.json({ data: null, message: 'Account deletion scheduled. All data will be removed within 30 days.' })
})

privacyRoutes.get('/audit-log', async (c) => {
  const { userId } = c.get('auth')

  const logs = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.userId, userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(100)

  return c.json({ data: logs, message: 'OK' })
})
