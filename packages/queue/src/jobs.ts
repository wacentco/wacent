export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'location'

export interface SendMessageJobData {
  messageId: string
  userId: string
  deviceId: string
  toNumber: string
  type: MessageType
  content: string | undefined
  mediaUrl: string | undefined
  caption: string | undefined
  campaignId: string | undefined
}

export interface DeliverWebhookJobData {
  webhookId: string
  userId: string
  eventType: string
  payload: Record<string, unknown>
  attemptCount: number
}

export interface ProcessCampaignJobData {
  campaignId: string
  userId: string
  batchOffset: number
}

export interface WarmDeviceJobData {
  deviceId: string
  userId: string
}
