import type { Redis } from 'ioredis'
import { db } from '@wazap/db'
import { devices } from '@wazap/db/schema'
import { eq } from 'drizzle-orm'

export async function onStatus(
  deviceId: string,
  status: 'connected' | 'disconnected',
  redis: Redis,
): Promise<void> {
  await db
    .update(devices)
    .set({
      status,
      qrCode: status === 'connected' ? null : undefined,
      connectedAt: status === 'connected' ? new Date() : undefined,
      lastSeenAt: new Date(),
    })
    .where(eq(devices.id, deviceId))

  // Publish for API server to fan out webhook events
  await redis.publish(
    'wazap:device-status',
    JSON.stringify({ deviceId, status, timestamp: new Date().toISOString() }),
  )
}
