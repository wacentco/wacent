import type { HttpClient } from '../http.js'
import type { ApiEnvelope, Device, DeviceQR } from '../types.js'

export class DevicesResource {
  constructor(private readonly http: HttpClient) {}

  async list(): Promise<ApiEnvelope<Device[]>> {
    return this.http.request<Device[]>('/devices')
  }

  async get(id: string): Promise<Device> {
    const res = await this.http.request<Device>(`/devices/${id}`)
    return res.data
  }

  async create(name: string): Promise<Device> {
    const res = await this.http.request<Device>('/devices', {
      method: 'POST',
      body: { name },
    })
    return res.data
  }

  async delete(id: string): Promise<void> {
    await this.http.request<null>(`/devices/${id}`, { method: 'DELETE' })
  }

  async getQR(id: string): Promise<DeviceQR> {
    const res = await this.http.request<DeviceQR>(`/devices/${id}/qr`)
    return res.data
  }

  async disconnect(id: string): Promise<void> {
    await this.http.request<null>(`/devices/${id}/disconnect`, { method: 'POST' })
  }

  async reconnect(id: string): Promise<void> {
    await this.http.request<null>(`/devices/${id}/reconnect`, { method: 'POST' })
  }
}
