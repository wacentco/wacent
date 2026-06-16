import type { Redis } from 'ioredis'
import { db } from '@wazap/db'
import { devices } from '@wazap/db/schema'
import { eq } from 'drizzle-orm'

export async function onQR(deviceId: string, qr: string, _redis: Redis): Promise<void> {
  await db.update(devices).set({ qrCode: qr, status: 'connecting' }).where(eq(devices.id, deviceId))
}
