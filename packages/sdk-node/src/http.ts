import { WazapError } from './error.js'
import type { ApiEnvelope } from './types.js'

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | boolean | undefined>
}

export class HttpClient {
  readonly baseUrl: string
  private readonly apiKey: string

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> {
    const { method = 'GET', body, query } = options

    let url = `${this.baseUrl}${path}`
    if (query) {
      const params = new URLSearchParams()
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) params.set(k, String(v))
      }
      const qs = params.toString()
      if (qs) url += `?${qs}`
    }

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': '@wazap/node/0.1.0',
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })

    let json: unknown
    try {
      json = await res.json()
    } catch {
      throw new WazapError('PARSE_ERROR', `Failed to parse response (HTTP ${res.status})`, res.status)
    }

    if (!res.ok) {
      const errBody = json as { error?: { code?: string; message?: string } }
      const code = errBody.error?.code ?? 'API_ERROR'
      const message = errBody.error?.message ?? `Request failed with status ${res.status}`
      throw new WazapError(code, message, res.status)
    }

    return json as ApiEnvelope<T>
  }
}
