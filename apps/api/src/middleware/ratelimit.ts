import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import type { Redis } from 'ioredis'

const WINDOW_MS = 60_000
const MAX_REQUESTS = 1000

export function rateLimit(redis: Redis) {
  return createMiddleware(async (c, next) => {
    const key = c.req.header('Authorization') ?? c.req.header('x-forwarded-for') ?? 'anonymous'
    const redisKey = `wacent:rl:${key}`
    const now = Date.now()

    const pipe = redis.pipeline()
    pipe.zremrangebyscore(redisKey, '-inf', now - WINDOW_MS)
    pipe.zadd(redisKey, now, `${now}-${Math.random()}`)
    pipe.zcard(redisKey)
    pipe.pexpire(redisKey, WINDOW_MS)
    const results = await pipe.exec()

    const count = (results?.[2]?.[1] as number) ?? 0
    if (count > MAX_REQUESTS) {
      throw new HTTPException(429, { message: 'Rate limit exceeded' })
    }

    await next()
  })
}
