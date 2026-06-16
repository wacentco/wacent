import { z } from 'zod'

export const PlanNameSchema = z.enum(['starter', 'growth', 'scale', 'agency'])
export type PlanName = z.infer<typeof PlanNameSchema>

export const PlanFeaturesSchema = z.object({
  api: z.boolean(),
  unlimitedMessages: z.boolean(),
  webhooks: z.boolean(),
  autoWarmer: z.boolean(),
  campaigns: z.boolean(),
  prioritySupport: z.boolean(),
})
export type PlanFeatures = z.infer<typeof PlanFeaturesSchema>

export const PlanSchema = z.object({
  id: z.string().uuid(),
  name: PlanNameSchema,
  priceMonthly: z.number().int().nonnegative(), // cents
  priceYearly: z.number().int().nonnegative(),  // cents
  maxDevices: z.number().int().positive(),
  features: PlanFeaturesSchema.nullable(),
})
export type Plan = z.infer<typeof PlanSchema>
