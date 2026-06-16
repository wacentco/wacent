import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import type { Redis } from 'ioredis'

// Sliding window rate limiter: 1000 req/min per API key
export function rateLimit(redis: Redis, limit = 1000, windowMs = 60_000) {
  return createMiddleware(async (c, next) => {
    const auth = c.get('auth')
    if (!auth) {
      await next()
      return
    }

    const now = Date.now()
    const windowStart = now - windowMs
    const key = `wazap:rl:${auth.apiKeyId}`

    const count = await redis
      .multi()
      .zremrangebyscore(key, '-inf', windowStart)
      .zadd(key, now, `${now}-${Math.random()}`)
      .zcard(key)
      .pexpire(key, windowMs)
      .exec()

    const current = (count?.[2]?.[1] as number) ?? 0

    c.header('X-RateLimit-Limit', String(limit))
    c.header('X-RateLimit-Remaining', String(Math.max(0, limit - current)))

    if (current > limit) {
      throw new HTTPException(429, { message: 'Rate limit exceeded' })
    }

    await next()
  })
}
