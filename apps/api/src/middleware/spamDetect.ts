import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import type { Redis } from 'ioredis'
import { db } from '@wacent/db'
import { spamAlerts } from '@wacent/db/schema'

const USER_LIMIT = 30
const WINDOW_TTL = 60

export function spamDetect(redis: Redis) {
  return createMiddleware(async (c, next) => {
    const { userId } = c.get('auth')
    const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown'

    const userKey = `spam:${userId}:1min`
    const ipKey = `spam:ip:${ip}:1min`

    const pipe = redis.pipeline()
    pipe.incr(userKey)
    pipe.incr(ipKey)
    const results = await pipe.exec()

    const userCount = (results?.[0]?.[1] as number) ?? 0
    const ipCount = (results?.[1]?.[1] as number) ?? 0

    if (userCount === 1) await redis.expire(userKey, WINDOW_TTL)
    if (ipCount === 1) await redis.expire(ipKey, WINDOW_TTL)

    if (userCount > USER_LIMIT) {
      // Fire-and-forget spam alert insert
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
}
