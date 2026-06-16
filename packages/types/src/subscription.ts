import { z } from 'zod'

export const SubscriptionStatusSchema = z.enum(['active', 'trialing', 'past_due', 'canceled'])
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>

export const SubscriptionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  planId: z.string().uuid(),
  status: SubscriptionStatusSchema,
  currentPeriodStart: z.string().datetime().nullable(),
  currentPeriodEnd: z.string().datetime().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  stripePriceId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type Subscription = z.infer<typeof SubscriptionSchema>
