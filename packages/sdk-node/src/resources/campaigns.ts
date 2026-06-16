import type { HttpClient } from '../http.js'
import type {
  AddRecipientsResult,
  ApiEnvelope,
  Campaign,
  CreateCampaignPayload,
} from '../types.js'

export interface Recipient {
  phoneNumber: string
  name?: string
}

export class CampaignsResource {
  constructor(private readonly http: HttpClient) {}

  async list(): Promise<ApiEnvelope<Campaign[]>> {
    return this.http.request<Campaign[]>('/campaigns')
  }

  async get(id: string): Promise<Campaign> {
    const res = await this.http.request<Campaign>(`/campaigns/${id}`)
    return res.data
  }

  async create(payload: CreateCampaignPayload): Promise<Campaign> {
    const res = await this.http.request<Campaign>('/campaigns', {
      method: 'POST',
      body: payload,
    })
    return res.data
  }

  async update(id: string, payload: Partial<CreateCampaignPayload>): Promise<Campaign> {
    const res = await this.http.request<Campaign>(`/campaigns/${id}`, {
      method: 'PATCH',
      body: payload,
    })
    return res.data
  }

  async delete(id: string): Promise<void> {
    await this.http.request<null>(`/campaigns/${id}`, { method: 'DELETE' })
  }

  async start(id: string): Promise<Campaign> {
    const res = await this.http.request<Campaign>(`/campaigns/${id}/start`, { method: 'POST' })
    return res.data
  }

  async pause(id: string): Promise<Campaign> {
    const res = await this.http.request<Campaign>(`/campaigns/${id}/pause`, { method: 'POST' })
    return res.data
  }

  async addRecipients(id: string, recipients: Recipient[]): Promise<AddRecipientsResult> {
    const res = await this.http.request<AddRecipientsResult>(`/campaigns/${id}/recipients`, {
      method: 'POST',
      body: { recipients },
    })
    return res.data
  }

  async listRecipients(id: string): Promise<ApiEnvelope<Recipient[]>> {
    return this.http.request<Recipient[]>(`/campaigns/${id}/recipients`)
  }
}
