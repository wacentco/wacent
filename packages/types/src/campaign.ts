import { z } from 'zod'
import { MessageTypeSchema } from './message.js'

export const CampaignStatusSchema = z.enum([
  'draft',
  'scheduled',
  'sending',
  'paused',
  'completed',
  'failed',
])
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>

export const CampaignSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  deviceId: z.string().uuid(),
  name: z.string(),
  status: CampaignStatusSchema,
  messageType: MessageTypeSchema,
  content: z.string().nullable(),
  mediaUrl: z.string().nullable(),
  caption: z.string().nullable(),
  recipientCount: z.number().int().nonnegative(),
  sentCount: z.number().int().nonnegative(),
  deliveredCount: z.number().int().nonnegative(),
  readCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  scheduledAt: z.string().datetime().nullable(),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  delayMs: z.number().int().min(1000),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type Campaign = z.infer<typeof CampaignSchema>

export const CreateCampaignSchema = z.object({
  deviceId: z.string().uuid(),
  name: z.string().min(1).max(255),
  messageType: MessageTypeSchema.default('text'),
  content: z.string().min(1).optional(),
  mediaUrl: z.string().url().optional(),
  caption: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  delayMs: z.number().int().min(1000).default(1500),
})
export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>

export const UpdateCampaignSchema = CreateCampaignSchema.omit({ deviceId: true }).partial()
export type UpdateCampaignInput = z.infer<typeof UpdateCampaignSchema>

export const CampaignRecipientSchema = z.object({
  id: z.string().uuid(),
  campaignId: z.string().uuid(),
  contactId: z.string().uuid().nullable(),
  phoneNumber: z.string(),
  status: z.enum(['pending', 'sent', 'failed']),
  messageId: z.string().uuid().nullable(),
  errorMessage: z.string().nullable(),
  processedAt: z.string().datetime().nullable(),
})
export type CampaignRecipient = z.infer<typeof CampaignRecipientSchema>
