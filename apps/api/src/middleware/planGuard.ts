import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { db } from '@wacent/db'
import { devices, users, plans } from '@wacent/db/schema'
import { eq, and, count } from 'drizzle-orm'

// Must be used after apiKeyAuth
export const planGuard = createMiddleware(async (c, next) => {
  const { userId } = c.get('auth')

  const [user] = await db
    .select({ planId: users.planId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user?.planId) {
    throw new HTTPException(403, { message: 'No active plan' })
  }

  const [plan] = await db
    .select({ maxDevices: plans.maxDevices })
    .from(plans)
    .where(eq(plans.id, user.planId))
    .limit(1)

  if (!plan) {
    throw new HTTPException(403, { message: 'Plan not found' })
  }

  const result = await db
    .select({ value: count() })
    .from(devices)
    .where(eq(devices.userId, userId))

  const deviceCount = result[0]?.value ?? 0

  if (deviceCount >= plan.maxDevices) {
    throw new HTTPException(403, {
      message: `Device limit reached. Your plan allows ${plan.maxDevices} device(s).`,
    })
  }

  await next()
})
