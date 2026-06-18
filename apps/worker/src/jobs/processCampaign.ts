import { Worker } from 'bullmq'
import { db } from '@wacent/db'
import { campaigns, campaignRecipients, devices, messages, users, plans, spamAlerts } from '@wacent/db/schema'
import { eq, and, count } from 'drizzle-orm'
import { QUEUE_NAMES, createProcessCampaignQueue } from '@wacent/queue'
import type { ProcessCampaignJobData } from '@wacent/queue'
import { bullMQConnection } from '../redis/client.js'
import type { SessionManager } from '../sessions/SessionManager.js'

const MIN_DELAY_MS = 1500
const BATCH_SIZE = 50

const PLAN_DAILY_LIMITS: Record<string, number> = {
  starter: 300,
  growth: 800,
  scale: 2000,
  agency: 5000,
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

async function getDailyLimit(userId: string): Promise<number> {
  const [user] = await db.select({ planId: users.planId }).from(users).where(eq(users.id, userId)).limit(1)
  if (!user?.planId) return PLAN_DAILY_LIMITS['starter'] ?? 300

  const [plan] = await db
    .select({ name: plans.name, features: plans.features })
    .from(plans)
    .where(eq(plans.id, user.planId))
    .limit(1)

  if (!plan) return PLAN_DAILY_LIMITS['starter'] ?? 300

  const features = plan.features as Record<string, unknown> | null
  if (features?.['maxRecipientsPerDay'] && typeof features['maxRecipientsPerDay'] === 'number') {
    return features['maxRecipientsPerDay']
  }

  return PLAN_DAILY_LIMITS[plan.name] ?? 300
}

async function countTodaySent(deviceId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(messages)
    .where(and(eq(messages.deviceId, deviceId), eq(messages.direction, 'outbound'), eq(messages.status, 'sent')))
  return row?.value ?? 0
}

export function createProcessCampaignWorker(manager: SessionManager) {
  const queue = createProcessCampaignQueue(bullMQConnection)

  return new Worker<ProcessCampaignJobData>(
    QUEUE_NAMES.PROCESS_CAMPAIGN,
    async (job) => {
      const { campaignId, userId, batchOffset } = job.data

      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)))
        .limit(1)

      if (!campaign || campaign.status !== 'sending') return

      const [device] = await db
        .select({ healthScore: devices.healthScore })
        .from(devices)
        .where(eq(devices.id, campaign.deviceId))
        .limit(1)

      if ((device?.healthScore ?? 100) < 30) {
        await db.update(campaigns).set({ status: 'paused', updatedAt: new Date() }).where(eq(campaigns.id, campaignId))
        await db.insert(spamAlerts).values({
          userId,
          deviceId: campaign.deviceId,
          type: 'CAMPAIGN_PAUSED_LOW_HEALTH',
          metadata: { campaignId, healthScore: device?.healthScore },
        })
        return
      }

      const dailyLimit = await getDailyLimit(userId)
      const todaySent = await countTodaySent(campaign.deviceId)
      if (todaySent >= dailyLimit) return

      const remaining = dailyLimit - todaySent
      const recipients = await db
        .select()
        .from(campaignRecipients)
        .where(and(eq(campaignRecipients.campaignId, campaignId), eq(campaignRecipients.status, 'pending')))
        .limit(Math.min(BATCH_SIZE, remaining))
        .offset(batchOffset)

      if (recipients.length === 0) {
        await db
          .update(campaigns)
          .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
          .where(eq(campaigns.id, campaignId))
        return
      }

      const delayMs = Math.max(MIN_DELAY_MS, campaign.delayMs)

      for (const recipient of recipients) {
        let waMessageId: string | null = null
        try {
          waMessageId = await manager.sendMessage(campaign.deviceId, recipient.phoneNumber, {
            type: campaign.messageType,
            content: campaign.content ?? undefined,
            mediaUrl: campaign.mediaUrl ?? undefined,
            caption: campaign.caption ?? undefined,
          })
        } catch (err) {
          console.error(`[Campaign] send failed for ${recipient.phoneNumber}:`, err)
        }

        if (waMessageId) {
          const [msg] = await db
            .insert(messages)
            .values({
              userId,
              deviceId: campaign.deviceId,
              campaignId,
              direction: 'outbound',
              toNumber: recipient.phoneNumber,
              type: campaign.messageType,
              content: campaign.content ?? null,
              mediaUrl: campaign.mediaUrl ?? null,
              caption: campaign.caption ?? null,
              status: 'sent',
              waMessageId,
              sentAt: new Date(),
            })
            .returning({ id: messages.id })

          await db
            .update(campaignRecipients)
            .set({ status: 'sent', messageId: msg?.id ?? null, processedAt: new Date() })
            .where(eq(campaignRecipients.id, recipient.id))

          await db
            .update(campaigns)
            .set({ sentCount: (campaign.sentCount ?? 0) + 1, updatedAt: new Date() })
            .where(eq(campaigns.id, campaignId))
        } else {
          await db
            .update(campaignRecipients)
            .set({ status: 'failed', processedAt: new Date() })
            .where(eq(campaignRecipients.id, recipient.id))
        }

        await sleep(delayMs)
      }

      const pendingRows = await db
        .select({ value: count() })
        .from(campaignRecipients)
        .where(and(eq(campaignRecipients.campaignId, campaignId), eq(campaignRecipients.status, 'pending')))
      const pendingCount = pendingRows[0]?.value ?? 0

      if (pendingCount > 0) {
        await queue.add('process', { campaignId, userId, batchOffset: batchOffset + BATCH_SIZE })
      } else {
        await db
          .update(campaigns)
          .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
          .where(eq(campaigns.id, campaignId))
      }
    },
    { connection: bullMQConnection, concurrency: 2 },
  )
}
