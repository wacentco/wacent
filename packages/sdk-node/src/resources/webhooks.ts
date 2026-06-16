import type { HttpClient } from '../http.js'
import type { ApiEnvelope, CreateWebhookPayload, Webhook } from '../types.js'

export interface WebhookLog {
  id: string
  webhookId: string
  eventType: string
  payload: Record<string, unknown>
  responseStatus: number | null
  responseBody: string | null
  attemptCount: number
  deliveredAt: string | null
  createdAt: string
}

export class WebhooksResource {
  constructor(private readonly http: HttpClient) {}

  async list(): Promise<ApiEnvelope<Webhook[]>> {
    return this.http.request<Webhook[]>('/webhooks')
  }

  async get(id: string): Promise<Webhook> {
    const res = await this.http.request<Webhook>(`/webhooks/${id}`)
    return res.data
  }

  async create(payload: CreateWebhookPayload): Promise<Webhook> {
    const res = await this.http.request<Webhook>('/webhooks', {
      method: 'POST',
      body: payload,
    })
    return res.data
  }

  async update(id: string, payload: Partial<CreateWebhookPayload>): Promise<Webhook> {
    const res = await this.http.request<Webhook>(`/webhooks/${id}`, {
      method: 'PUT',
      body: payload,
    })
    return res.data
  }

  async delete(id: string): Promise<void> {
    await this.http.request<null>(`/webhooks/${id}`, { method: 'DELETE' })
  }

  async getLogs(id: string): Promise<ApiEnvelope<WebhookLog[]>> {
    return this.http.request<WebhookLog[]>(`/webhooks/${id}/logs`)
  }

  async test(id: string): Promise<{ success: boolean }> {
    const res = await this.http.request<{ success: boolean }>(`/webhooks/${id}/test`, {
      method: 'POST',
    })
    return res.data
  }
}
