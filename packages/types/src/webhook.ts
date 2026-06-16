import { z } from 'zod'

export const WebhookEventSchema = z.enum([
  'message.sent',
  'message.delivered',
  'message.read',
  'message.failed',
  'message.received',
  'device.connected',
  'device.disconnected',
  'device.qr_updated',
])
export type WebhookEvent = z.infer<typeof WebhookEventSchema>

export const WebhookSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  url: z.string().url(),
  events: z.array(WebhookEventSchema),
  isActive: z.boolean(),
  failureCount: z.number().int().nonnegative(),
  lastTriggeredAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type Webhook = z.infer<typeof WebhookSchema>

export const CreateWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(WebhookEventSchema).min(1),
  secret: z.string().min(16).max(256),
})
export type CreateWebhookInput = z.infer<typeof CreateWebhookSchema>

export const UpdateWebhookSchema = CreateWebhookSchema.omit({ secret: true }).partial().extend({
  secret: z.string().min(16).max(256).optional(),
})
export type UpdateWebhookInput = z.infer<typeof UpdateWebhookSchema>

// Outbound webhook payload shape
export const WebhookPayloadSchema = z.object({
  event: WebhookEventSchema,
  timestamp: z.string().datetime(),
  data: z.record(z.unknown()),
})
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>

export const WebhookLogSchema = z.object({
  id: z.string().uuid(),
  webhookId: z.string().uuid(),
  eventType: WebhookEventSchema,
  payload: WebhookPayloadSchema,
  responseStatus: z.number().int().nullable(),
  responseBody: z.string().nullable(),
  attemptCount: z.number().int().nonnegative(),
  deliveredAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
})
export type WebhookLog = z.infer<typeof WebhookLogSchema>
