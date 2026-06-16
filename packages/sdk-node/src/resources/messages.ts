import type { HttpClient } from '../http.js'
import type {
  ApiEnvelope,
  ListMessagesParams,
  Message,
  SendMessagePayload,
  SendMessageResult,
} from '../types.js'

export class MessagesResource {
  constructor(private readonly http: HttpClient) {}

  async send(payload: SendMessagePayload): Promise<SendMessageResult> {
    const res = await this.http.request<SendMessageResult>('/messages/send', {
      method: 'POST',
      body: payload,
    })
    return res.data
  }

  async list(params: ListMessagesParams = {}): Promise<ApiEnvelope<Message[]>> {
    return this.http.request<Message[]>('/messages', {
      query: params as Record<string, string | number | boolean | undefined>,
    })
  }

  async get(id: string): Promise<Message> {
    const res = await this.http.request<Message>(`/messages/${id}`)
    return res.data
  }
}
