import { Worker } from 'bullmq'
import { db } from '@wacent/db'
import { devices } from '@wacent/db/schema'
import { eq } from 'drizzle-orm'
import { QUEUE_NAMES } from '@wacent/queue'
import { bullMQConnection } from '../redis/client.js'

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function calcHealthDelta(sentToday: number, failedToday: number): number {
  if (sentToday === 0) return 0
  const failureRate = failedToday / sentToday
  if (failureRate > 0.2) return -10
  if (failureRate > 0.1) return -5
  if (failedToday === 0 && sentToday > 0) return 5
  return 0
}

export function createHealthCheckWorker() {
  return new Worker(
    QUEUE_NAMES.HEALTH_CHECK,
    async () => {
      const connectedDevices = await db
        .select({
          id: devices.id,
          healthScore: devices.healthScore,
          messagesSentToday: devices.messagesSentToday,
          messagesFailedToday: devices.messagesFailedToday,
        })
        .from(devices)
        .where(eq(devices.status, 'connected'))

      for (const device of connectedDevices) {
        const delta = calcHealthDelta(device.messagesSentToday, device.messagesFailedToday)
        const newScore = clamp((device.healthScore ?? 100) + delta, 0, 100)
        await db
          .update(devices)
          .set({ healthScore: newScore, lastHealthCheck: new Date(), updatedAt: new Date() })
          .where(eq(devices.id, device.id))
      }
    },
    { connection: bullMQConnection, concurrency: 1 },
  )
}

export async function resetDailyCounters() {
  await db
    .update(devices)
    .set({ messagesSentToday: 0, messagesFailedToday: 0, updatedAt: new Date() })
}
