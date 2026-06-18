import { Worker } from 'bullmq'
import { createHmac } from 'node:crypto'
import { db } from '@wacent/db'
import { webhooks, webhookLogs } from '@wacent/db/schema'
import { eq } from 'drizzle-orm'
import { QUEUE_NAMES } from '@wacent/queue'
import type { DeliverWebhookJobData } from '@wacent/queue'
import { bullMQConnection } from '../redis/client.js'

export function createDeliverWebhookWorker() {
  return new Worker<DeliverWebhookJobData>(
    QUEUE_NAMES.DELIVER_WEBHOOK,
    async (job) => {
      const { webhookId, eventType, payload } = job.data
      console.log(`[DeliverWebhook] Processing job ${job.id} — webhookId=${webhookId} event=${eventType}`)

      const [webhook] = await db
        .select()
        .from(webhooks)
        .where(eq(webhooks.id, webhookId))
        .limit(1)

      if (!webhook || !webhook.isActive) return

      const body = JSON.stringify(payload)
      const signature = `sha256=${createHmac('sha256', webhook.secretHash).update(body).digest('hex')}`

      let responseStatus: number | null = null
      let responseBody: string | null = null
      let success = false

      try {
        const res = await fetch(webhook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-WACENT-Signature': signature },
          body,
          signal: AbortSignal.timeout(10_000),
        })
        responseStatus = res.status
        responseBody = await res.text()
        success = res.ok
      } catch (err) {
        responseBody = err instanceof Error ? err.message : 'Request failed'
      }

      await db.insert(webhookLogs).values({
        webhookId,
        eventType,
        payload,
        responseStatus,
        responseBody,
        attemptCount: job.attemptsMade + 1,
        deliveredAt: success ? new Date() : null,
      })

      if (success) {
        await db
          .update(webhooks)
          .set({ lastTriggeredAt: new Date(), failureCount: 0, updatedAt: new Date() })
          .where(eq(webhooks.id, webhookId))
      } else {
        const newFailureCount = (webhook.failureCount ?? 0) + 1
        await db
          .update(webhooks)
          .set({
            failureCount: newFailureCount,
            ...(newFailureCount >= 5 ? { isActive: false } : {}),
            updatedAt: new Date(),
          })
          .where(eq(webhooks.id, webhookId))

        throw new Error(`Webhook delivery failed: HTTP ${responseStatus ?? 'timeout'}`)
      }
    },
    { connection: bullMQConnection, concurrency: 5 },
  )
}
