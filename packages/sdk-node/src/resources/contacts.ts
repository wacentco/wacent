import type { HttpClient } from '../http.js'
import type {
  ApiEnvelope,
  Contact,
  CreateContactPayload,
  ImportContactsResult,
  ListContactsParams,
} from '../types.js'

export class ContactsResource {
  constructor(private readonly http: HttpClient) {}

  async list(params: ListContactsParams = {}): Promise<ApiEnvelope<Contact[]>> {
    return this.http.request<Contact[]>('/contacts', {
      query: params as Record<string, string | number | boolean | undefined>,
    })
  }

  async get(id: string): Promise<Contact> {
    const res = await this.http.request<Contact>(`/contacts/${id}`)
    return res.data
  }

  async create(payload: CreateContactPayload): Promise<Contact> {
    const res = await this.http.request<Contact>('/contacts', {
      method: 'POST',
      body: payload,
    })
    return res.data
  }

  async update(id: string, payload: Partial<CreateContactPayload>): Promise<Contact> {
    const res = await this.http.request<Contact>(`/contacts/${id}`, {
      method: 'PUT',
      body: payload,
    })
    return res.data
  }

  async delete(id: string): Promise<void> {
    await this.http.request<null>(`/contacts/${id}`, { method: 'DELETE' })
  }

  async import(contacts: CreateContactPayload[]): Promise<ImportContactsResult> {
    const res = await this.http.request<ImportContactsResult>('/contacts/import', {
      method: 'POST',
      body: { contacts },
    })
    return res.data
  }
}
