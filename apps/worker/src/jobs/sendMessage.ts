import { Worker } from 'bullmq'
import { db } from '@wacent/db'
import { messages } from '@wacent/db/schema'
import { eq } from 'drizzle-orm'
import { QUEUE_NAMES } from '@wacent/queue'
import type { SendMessageJobData } from '@wacent/queue'
import { bullMQConnection } from '../redis/client.js'
import type { SessionManager } from '../sessions/SessionManager.js'

export function createSendMessageWorker(manager: SessionManager) {
  return new Worker<SendMessageJobData>(
    QUEUE_NAMES.SEND_MESSAGE,
    async (job) => {
      const { messageId, deviceId, toNumber, type, content, mediaUrl, caption } = job.data

      try {
        const waMessageId = await manager.sendMessage(deviceId, toNumber, { type, content, mediaUrl, caption })
        await db
          .update(messages)
          .set({ status: 'sent', waMessageId, sentAt: new Date(), updatedAt: new Date() })
          .where(eq(messages.id, messageId))
      } catch (err) {
        await db
          .update(messages)
          .set({
            status: 'failed',
            errorMessage: err instanceof Error ? err.message : 'Send failed',
            updatedAt: new Date(),
          })
          .where(eq(messages.id, messageId))
        throw err
      }
    },
    { connection: bullMQConnection, concurrency: 5 },
  )
}
