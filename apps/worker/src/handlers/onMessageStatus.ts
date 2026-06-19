import { db } from '@wacent/db'
import { messages, webhooks } from '@wacent/db/schema'
import { eq, and } from 'drizzle-orm'
import { createDeliverWebhookQueue } from '@wacent/queue'
import { bullMQConnection } from '../redis/client.js'

const webhookQueue = createDeliverWebhookQueue(bullMQConnection)

function mapStatus(status: number): { dbStatus: 'delivered' | 'read'; eventType: string } | null {
  if (status === 2) return { dbStatus: 'delivered', eventType: 'message.delivered' }
  if (status >= 3) return { dbStatus: 'read', eventType: 'message.read' }
  return null
}

export async function onMessageStatus(deviceId: string, waMessageId: string, status: number, timestamp: string): Promise<void> {
  const mapped = mapStatus(status)
  if (!mapped) return

  const [msg] = await db
    .select({ id: messages.id, userId: messages.userId, deviceId: messages.deviceId, status: messages.status })
    .from(messages)
    .where(eq(messages.waMessageId, waMessageId))
    .limit(1)

  if (!msg) return
  // Never downgrade: if already 'read', don't set back to 'delivered'
  if (mapped.dbStatus === 'delivered' && msg.status === 'read') return

  await db
    .update(messages)
    .set({
      status: mapped.dbStatus,
      ...(mapped.dbStatus === 'delivered' ? { deliveredAt: new Date() } : { readAt: new Date() }),
      updatedAt: new Date(),
    })
    .where(eq(messages.id, msg.id))

  const userWebhooks = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.userId, msg.userId), eq(webhooks.isActive, true)))

  const payload = {
    event: mapped.eventType,
    timestamp,
    data: {
      messageId: msg.id,
      deviceId: msg.deviceId,
      waMessageId,
      status: mapped.dbStatus,
    },
  }

  for (const webhook of userWebhooks) {
    const events = webhook.events as string[]
    if (!events.includes(mapped.eventType)) continue
    await webhookQueue.add('deliver', {
      webhookId: webhook.id,
      userId: msg.userId,
      eventType: mapped.eventType,
      payload,
      attemptCount: 1,
    })
  }
}
