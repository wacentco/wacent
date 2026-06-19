import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '@wacent/db'
import { campaigns, campaignRecipients, devices } from '@wacent/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { CreateCampaignSchema, UpdateCampaignSchema } from '@wacent/types'
import { workerFetch } from '../lib/workerFetch.js'
import { flexAuth } from '../middleware/flexAuth.js'

const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const addRecipientsSchema = z.object({
  phoneNumbers: z.array(z.string().min(7).max(20)).min(1).max(10000),
})

export const campaignRoutes = new Hono()

campaignRoutes.use(flexAuth)

campaignRoutes.get('/', zValidator('query', pageSchema), async (c) => {
  const { userId } = c.get('auth')
  const { page, limit } = c.req.valid('query')

  const rows = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.userId, userId))
    .orderBy(desc(campaigns.createdAt))
    .limit(limit)
    .offset((page - 1) * limit)

  return c.json({ data: rows, meta: { page, limit }, message: 'OK' })
})

campaignRoutes.post('/', zValidator('json', CreateCampaignSchema), async (c) => {
  const { userId } = c.get('auth')
  const input = c.req.valid('json')

  const [device] = await db
    .select({ id: devices.id })
    .from(devices)
    .where(and(eq(devices.id, input.deviceId), eq(devices.userId, userId)))
    .limit(1)

  if (!device) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Device not found' } }, 404)
  }

  const [campaign] = await db
    .insert(campaigns)
    .values({
      userId,
      deviceId: input.deviceId,
      name: input.name,
      messageType: input.messageType ?? 'text',
      content: input.content ?? null,
      mediaUrl: input.mediaUrl ?? null,
      caption: input.caption ?? null,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      delayMs: input.delayMs ?? 1500,
      status: 'draft',
    })
    .returning()

  return c.json({ data: campaign, message: 'Created' }, 201)
})

campaignRoutes.get('/:id', async (c) => {
  const { userId } = c.get('auth')
  const id = c.req.param('id')

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)))
    .limit(1)

  if (!campaign) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Campaign not found' } }, 404)
  }

  return c.json({ data: campaign, message: 'OK' })
})

campaignRoutes.patch('/:id', zValidator('json', UpdateCampaignSchema), async (c) => {
  const { userId } = c.get('auth')
  const id = c.req.param('id')
  const input = c.req.valid('json')

  const [existing] = await db
    .select({ id: campaigns.id, status: campaigns.status })
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)))
    .limit(1)

  if (!existing) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Campaign not found' } }, 404)
  }
  if (existing.status !== 'draft') {
    return c.json({ error: { code: 'INVALID_STATE', message: 'Only draft campaigns can be edited' } }, 422)
  }

  const [updated] = await db
    .update(campaigns)
    .set({
      ...(input.name ? { name: input.name } : {}),
      ...(input.content !== undefined ? { content: input.content ?? null } : {}),
      ...(input.mediaUrl !== undefined ? { mediaUrl: input.mediaUrl ?? null } : {}),
      ...(input.caption !== undefined ? { caption: input.caption ?? null } : {}),
      ...(input.scheduledAt !== undefined ? { scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null } : {}),
      ...(input.delayMs !== undefined ? { delayMs: input.delayMs } : {}),
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, id))
    .returning()

  return c.json({ data: updated, message: 'Updated' })
})

campaignRoutes.delete('/:id', async (c) => {
  const { userId } = c.get('auth')
  const id = c.req.param('id')

  const [existing] = await db
    .select({ id: campaigns.id, status: campaigns.status })
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)))
    .limit(1)

  if (!existing) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Campaign not found' } }, 404)
  }
  if (existing.status === 'sending') {
    return c.json({ error: { code: 'INVALID_STATE', message: 'Cannot delete a campaign that is sending' } }, 422)
  }

  await db.delete(campaigns).where(eq(campaigns.id, id))
  return c.json({ data: null, message: 'Deleted' })
})

campaignRoutes.post('/:id/start', async (c) => {
  const { userId } = c.get('auth')
  const id = c.req.param('id')

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)))
    .limit(1)

  if (!campaign) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Campaign not found' } }, 404)
  }
  if (!['draft', 'paused'].includes(campaign.status)) {
    return c.json({ error: { code: 'INVALID_STATE', message: 'Campaign cannot be started' } }, 422)
  }
  if ((campaign.recipientCount ?? 0) === 0) {
    return c.json({ error: { code: 'NO_RECIPIENTS', message: 'Add recipients before starting' } }, 422)
  }

  await db
    .update(campaigns)
    .set({ status: 'sending', startedAt: new Date(), updatedAt: new Date() })
    .where(eq(campaigns.id, id))

  workerFetch('/internal/jobs/process-campaign', { campaignId: id, userId, batchOffset: 0 }).catch((err) =>
    console.warn('Worker campaign trigger failed (non-critical):', err),
  )

  return c.json({ data: { id, status: 'sending' }, message: 'Campaign started' })
})

campaignRoutes.post('/:id/pause', async (c) => {
  const { userId } = c.get('auth')
  const id = c.req.param('id')

  const [campaign] = await db
    .select({ id: campaigns.id, status: campaigns.status })
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)))
    .limit(1)

  if (!campaign) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Campaign not found' } }, 404)
  }
  if (campaign.status !== 'sending') {
    return c.json({ error: { code: 'INVALID_STATE', message: 'Campaign is not currently sending' } }, 422)
  }

  await db
    .update(campaigns)
    .set({ status: 'paused', updatedAt: new Date() })
    .where(eq(campaigns.id, id))

  return c.json({ data: { id, status: 'paused' }, message: 'Campaign paused' })
})

campaignRoutes.post('/:id/recipients', zValidator('json', addRecipientsSchema), async (c) => {
  const { userId } = c.get('auth')
  const id = c.req.param('id')
  const { phoneNumbers } = c.req.valid('json')

  const [campaign] = await db
    .select({ id: campaigns.id, status: campaigns.status })
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)))
    .limit(1)

  if (!campaign) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Campaign not found' } }, 404)
  }
  if (!['draft', 'paused'].includes(campaign.status)) {
    return c.json({ error: { code: 'INVALID_STATE', message: 'Cannot add recipients to this campaign' } }, 422)
  }

  const rows = phoneNumbers.map((phone) => ({ campaignId: id, phoneNumber: phone, status: 'pending' as const }))
  await db.insert(campaignRecipients).values(rows).onConflictDoNothing()

  await db
    .update(campaigns)
    .set({ recipientCount: rows.length, updatedAt: new Date() })
    .where(eq(campaigns.id, id))

  return c.json({ data: { added: rows.length }, message: 'Recipients added' })
})

campaignRoutes.get('/:id/recipients', zValidator('query', pageSchema), async (c) => {
  const { userId } = c.get('auth')
  const id = c.req.param('id')
  const { page, limit } = c.req.valid('query')

  const [campaign] = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)))
    .limit(1)

  if (!campaign) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Campaign not found' } }, 404)
  }

  const rows = await db
    .select()
    .from(campaignRecipients)
    .where(eq(campaignRecipients.campaignId, id))
    .limit(limit)
    .offset((page - 1) * limit)

  return c.json({ data: rows, meta: { page, limit }, message: 'OK' })
})
