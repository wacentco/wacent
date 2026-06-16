import { Hono } from 'hono'
import Stripe from 'stripe'
import { db } from '@wacent/db'
import { users, subscriptions, plans } from '@wacent/db/schema'
import { eq } from 'drizzle-orm'
import { jwtAuth } from '../middleware/auth.js'

const stripe = new Stripe(process.env['STRIPE_SECRET_KEY'] ?? '', { apiVersion: '2026-05-27.dahlia' })
const FRONTEND_URL = process.env['FRONTEND_URL'] ?? 'http://localhost:3000'

export const billingRoutes = new Hono()

billingRoutes.use(jwtAuth)

billingRoutes.get('/subscription', async (c) => {
  const { userId } = c.get('auth')

  const [row] = await db
    .select({
      planName: plans.name,
      priceMonthly: plans.priceMonthly,
      priceYearly: plans.priceYearly,
      maxDevices: plans.maxDevices,
      features: plans.features,
      subStatus: subscriptions.status,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      stripeSubscriptionId: subscriptions.stripeSubscriptionId,
    })
    .from(users)
    .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
    .leftJoin(plans, eq(plans.id, subscriptions.planId))
    .where(eq(users.id, userId))
    .limit(1)

  return c.json({ data: row ?? null, message: 'OK' })
})

billingRoutes.post('/portal', async (c) => {
  const { userId } = c.get('auth')

  const [user] = await db
    .select({ stripeCustomerId: users.stripeCustomerId, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, 404)
  }

  let customerId = user.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, metadata: { userId } })
    customerId = customer.id
    await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, userId))
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${FRONTEND_URL}/billing`,
  })

  return c.json({ data: { url: session.url }, message: 'OK' })
})

billingRoutes.post('/checkout', async (c) => {
  const { userId } = c.get('auth')
  const body = await c.req.json() as { priceId: string }

  if (!body.priceId) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'priceId required' } }, 400)
  }

  const [user] = await db
    .select({ stripeCustomerId: users.stripeCustomerId, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, 404)
  }

  let customerId = user.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, metadata: { userId } })
    customerId = customer.id
    await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, userId))
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: body.priceId, quantity: 1 }],
    success_url: `${FRONTEND_URL}/billing?success=1`,
    cancel_url: `${FRONTEND_URL}/billing`,
    metadata: { userId },
  })

  return c.json({ data: { url: session.url }, message: 'OK' })
})
