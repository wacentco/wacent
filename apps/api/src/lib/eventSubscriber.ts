import type { Redis } from 'ioredis'
import { db } from '@wacent/db'
import { messages, webhooks } from '@wacent/db/schema'
import { eq, and } from 'drizzle-orm'
import { createDeliverWebhookQueue } from '@wacent/queue'
import { redisConn } from './redis.js'

interface StatusEvent {
  deviceId: string
  waMessageId: string
  status: number
  timestamp: string
}

function mapStatus(status: number): { dbStatus: 'delivered' | 'read'; eventType: string } | null {
  if (status === 2) return { dbStatus: 'delivered', eventType: 'message.delivered' }
  if (status >= 3) return { dbStatus: 'read', eventType: 'message.read' }
  return null
}

export function startEventSubscriber(redisSub: Redis): void {
  const webhookQueue = createDeliverWebhookQueue(redisConn)

  void redisSub.subscribe('wacent:events:status', (err) => {
    if (err) console.error('[EventSubscriber] subscribe error:', err)
    else console.log('[EventSubscriber] subscribed to wacent:events:status')
  })

  redisSub.on('message', (channel, raw) => {
    if (channel !== 'wacent:events:status') return
    void (async () => {
      try {
        const event = JSON.parse(raw) as StatusEvent
        const mapped = mapStatus(event.status)
        if (!mapped) return

        const [msg] = await db
          .select({ id: messages.id, userId: messages.userId, deviceId: messages.deviceId, status: messages.status })
          .from(messages)
          .where(eq(messages.waMessageId, event.waMessageId))
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
          timestamp: event.timestamp,
          data: {
            messageId: msg.id,
            deviceId: msg.deviceId,
            waMessageId: event.waMessageId,
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
      } catch (err) {
        console.error('[EventSubscriber] error handling status event:', err)
      }
    })()
  })
}
