import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { db } from '@wacent/db'
import { devices, users, plans, subscriptions } from '@wacent/db/schema'
import { eq, and, count, inArray } from 'drizzle-orm'

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

  const [sub] = await db
    .select({ status: subscriptions.status })
    .from(subscriptions)
    .where(and(
      eq(subscriptions.userId, userId),
      inArray(subscriptions.status, ['active', 'trialing']),
    ))
    .limit(1)

  if (!sub) {
    throw new HTTPException(403, { message: 'No active plan' })
  }

  const [plan] = await db
    .select({ maxDevices: plans.maxDevices, name: plans.name })
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

  // Enforce per-plan limits: starter=1, growth=5, scale=15, agency=50
  if (deviceCount >= plan.maxDevices) {
    throw new HTTPException(403, {
      message: `Device limit reached. Your ${plan.name ?? 'current'} plan allows ${plan.maxDevices} device(s). Upgrade to add more.`,
    })
  }

  await next()
})
