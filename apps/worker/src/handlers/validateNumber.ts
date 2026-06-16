import type { WASocket } from '@whiskeysockets/baileys'
import type { Redis } from 'ioredis'

const CACHE_TTL = 86400 // 24 hours

function normalizeE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('+') ? phone : `+${digits}`
}

export async function validateWhatsAppNumber(
  phoneNumber: string,
  socket: WASocket,
  redis: Redis,
): Promise<void> {
  const normalized = normalizeE164(phoneNumber)
  const cacheKey = `wa_valid:${normalized}`

  const cached = await redis.get(cacheKey)
  if (cached !== null) {
    if (cached === '0') throw new Error('INVALID_WA_NUMBER')
    return
  }

  const results = await socket.onWhatsApp(normalized.replace('+', '') + '@s.whatsapp.net')
  const exists = results?.[0]?.exists ?? false

  await redis.setex(cacheKey, CACHE_TTL, exists ? '1' : '0')

  if (!exists) throw new Error('INVALID_WA_NUMBER')
}
