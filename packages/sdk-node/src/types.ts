// ── Shared primitives ────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number
  limit: number
  total?: number
}

export interface ApiEnvelope<T> {
  data: T
  meta?: PaginationMeta
  message: string
}

// ── Devices ──────────────────────────────────────────────────────────────────

export type DeviceStatus = 'disconnected' | 'connecting' | 'connected' | 'banned'

export interface Device {
  id: string
  userId: string
  name: string
  phoneNumber: string | null
  status: DeviceStatus
  autoWarm: boolean
  warmProgress: number
  lastSeenAt: string | null
  connectedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface DeviceQR {
  deviceId: string
  qrCode: string | null
  status: DeviceStatus
}

// ── Messages ─────────────────────────────────────────────────────────────────

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'location'
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
export type MessageDirection = 'outbound' | 'inbound'

export interface Message {
  id: string
  userId: string
  deviceId: string
  campaignId: string | null
  direction: MessageDirection
  toNumber: string | null
  fromNumber: string | null
  type: MessageType
  content: string | null
  mediaUrl: string | null
  caption: string | null
  status: MessageStatus
  waMessageId: string | null
  errorMessage: string | null
  sentAt: string | null
  deliveredAt: string | null
  readAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SendMessagePayload {
  whatsapp_account_id: string
  phone_number: string
  type: MessageType
  content?: string
  media_url?: string
  caption?: string
}

export interface SendMessageResult {
  message_id: string
  status: MessageStatus
  created_at: string
}

export interface ListMessagesParams {
  page?: number
  limit?: number
}

// ── Campaigns ────────────────────────────────────────────────────────────────

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'paused' | 'completed' | 'failed'

export interface Campaign {
  id: string
  userId: string
  deviceId: string
  name: string
  status: CampaignStatus
  messageType: MessageType
  content: string | null
  mediaUrl: string | null
  caption: string | null
  recipientCount: number
  sentCount: number
  deliveredCount: number
  readCount: number
  failedCount: number
  scheduledAt: string | null
  startedAt: string | null
  completedAt: string | null
  delayMs: number
  createdAt: string
  updatedAt: string
}

export interface CreateCampaignPayload {
  deviceId: string
  name: string
  messageType?: MessageType
  content?: string
  mediaUrl?: string
  caption?: string
  scheduledAt?: string
  delayMs?: number
}

export interface AddRecipientsResult {
  added: number
}

// ── Contacts ─────────────────────────────────────────────────────────────────

export interface Contact {
  id: string
  userId: string
  phoneNumber: string
  name: string | null
  email: string | null
  tags: string[] | null
  metadata: Record<string, unknown> | null
  waSynced: boolean
  waProfileName: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateContactPayload {
  phoneNumber: string
  name?: string
  email?: string
  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface ListContactsParams {
  page?: number
  limit?: number
  search?: string
}

export interface ImportContactsResult {
  created: number
  failed: number
  errors: Array<{ row: number; phone: string; reason: string }>
}

// ── Webhooks ─────────────────────────────────────────────────────────────────

export type WebhookEvent =
  | 'message.sent'
  | 'message.delivered'
  | 'message.read'
  | 'message.failed'
  | 'message.received'
  | 'device.connected'
  | 'device.disconnected'
  | 'device.qr_updated'

export interface Webhook {
  id: string
  userId: string
  url: string
  events: WebhookEvent[]
  isActive: boolean
  failureCount: number
  lastTriggeredAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateWebhookPayload {
  url: string
  events: WebhookEvent[]
  secret: string
}
