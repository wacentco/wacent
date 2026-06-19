import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { db } from '@wacent/db'
import { spamAlerts } from '@wacent/db/schema'

const USER_LIMIT = 30
const WINDOW_MS = 60_000

const userStore = new Map<string, { count: number; resetAt: number }>()
const ipStore = new Map<string, { count: number; resetAt: number }>()

function increment(store: Map<string, { count: number; resetAt: number }>, key: string): number {
  const now = Date.now()
  const entry = store.get(key)
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return 1
  }
  entry.count++
  return entry.count
}

export const spamDetect = createMiddleware(async (c, next) => {
  const { userId } = c.get('auth')
  const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown'

  const userCount = increment(userStore, userId)
  const ipCount = increment(ipStore, ip)

  if (userCount > USER_LIMIT) {
    const deviceId = c.req.query('device_id') ?? ''
    if (deviceId) {
      void db.insert(spamAlerts).values({
        userId,
        deviceId,
        type: 'RATE_LIMIT_HIT',
        metadata: { userCount, ipCount, ip },
      })
    }
    throw new HTTPException(429, { message: 'Too many requests. Slow down.' })
  }

  await next()
})
