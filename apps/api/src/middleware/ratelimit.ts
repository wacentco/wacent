import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'

const WINDOW_MS = 60_000
const MAX_REQUESTS = 1000

const store = new Map<string, { count: number; resetAt: number }>()

function check(key: string): boolean {
  const now = Date.now()
  const entry = store.get(key)
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= MAX_REQUESTS) return false
  entry.count++
  return true
}

export const rateLimit = createMiddleware(async (c, next) => {
  const key = c.req.header('Authorization') ?? c.req.header('x-forwarded-for') ?? 'anonymous'
  if (!check(key)) {
    throw new HTTPException(429, { message: 'Rate limit exceeded' })
  }
  await next()
})
