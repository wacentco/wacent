import type { BaileysEventMap } from '@whiskeysockets/baileys'
import type { Redis } from 'ioredis'

type MessageUpsert = BaileysEventMap['messages.upsert']

export async function onMessage(
  deviceId: string,
  upsert: MessageUpsert,
  redis: Redis,
): Promise<void> {
  if (upsert.type !== 'notify') return

  for (const msg of upsert.messages) {
    if (msg.key.fromMe) continue

    await redis.publish(
      'WACENT:inbound',
      JSON.stringify({ deviceId, message: msg, timestamp: new Date().toISOString() }),
    )
  }
}
