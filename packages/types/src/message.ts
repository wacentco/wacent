import { z } from 'zod'
import { E164Schema } from './common.js'

export const MessageTypeSchema = z.enum(['text', 'image', 'video', 'audio', 'document', 'location'])
export type MessageType = z.infer<typeof MessageTypeSchema>

export const MessageStatusSchema = z.enum(['queued', 'sent', 'delivered', 'read', 'failed'])
export type MessageStatus = z.infer<typeof MessageStatusSchema>

export const MessageDirectionSchema = z.enum(['outbound', 'inbound'])
export type MessageDirection = z.infer<typeof MessageDirectionSchema>

export const MessageSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  deviceId: z.string().uuid(),
  campaignId: z.string().uuid().nullable(),
  direction: MessageDirectionSchema,
  toNumber: z.string().nullable(),
  fromNumber: z.string().nullable(),
  type: MessageTypeSchema,
  content: z.string().nullable(),
  mediaUrl: z.string().url().nullable(),
  caption: z.string().nullable(),
  status: MessageStatusSchema,
  waMessageId: z.string().nullable(),
  errorMessage: z.string().nullable(),
  sentAt: z.string().datetime().nullable(),
  deliveredAt: z.string().datetime().nullable(),
  readAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type Message = z.infer<typeof MessageSchema>

export const SendMessageSchema = z
  .object({
    whatsapp_account_id: z.string().uuid(),
    phone_number: E164Schema,
    type: MessageTypeSchema.default('text'),
    content: z.string().min(1).optional(),
    media_url: z.string().url().optional(),
    caption: z.string().optional(),
  })
  .refine(
    (d) => (d.type === 'text' ? d.content !== undefined : d.media_url !== undefined),
    { message: 'content required for text messages; media_url required for media messages' },
  )
export type SendMessageInput = z.infer<typeof SendMessageSchema>
