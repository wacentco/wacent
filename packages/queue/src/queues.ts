import { Queue, Worker, type ConnectionOptions } from 'bullmq'
import type {
  SendMessageJobData,
  DeliverWebhookJobData,
  ProcessCampaignJobData,
  WarmDeviceJobData,
} from './jobs.js'

export const QUEUE_NAMES = {
  SEND_MESSAGE: 'send-message',
  DELIVER_WEBHOOK: 'deliver-webhook',
  PROCESS_CAMPAIGN: 'process-campaign',
  WARM_DEVICE: 'warm-device',
} as const

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]

export function createSendMessageQueue(connection: ConnectionOptions) {
  return new Queue<SendMessageJobData>(QUEUE_NAMES.SEND_MESSAGE, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 500 },
    },
  })
}

export function createDeliverWebhookQueue(connection: ConnectionOptions) {
  return new Queue<DeliverWebhookJobData>(QUEUE_NAMES.DELIVER_WEBHOOK, {
    connection,
    defaultJobOptions: {
      attempts: 5,
      // 5s → 30s → 5m → 30m → 2h
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 500 },
    },
  })
}

export function createProcessCampaignQueue(connection: ConnectionOptions) {
  return new Queue<ProcessCampaignJobData>(QUEUE_NAMES.PROCESS_CAMPAIGN, {
    connection,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'fixed', delay: 5000 },
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 200 },
    },
  })
}

export function createWarmDeviceQueue(connection: ConnectionOptions) {
  return new Queue<WarmDeviceJobData>(QUEUE_NAMES.WARM_DEVICE, {
    connection,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'fixed', delay: 10000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    },
  })
}

// Re-export Worker so consumers only need @wacent/queue
export { Worker, type ConnectionOptions }
