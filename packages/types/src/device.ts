import { z } from 'zod'

export const DeviceStatusSchema = z.enum(['disconnected', 'connecting', 'connected', 'banned'])
export type DeviceStatus = z.infer<typeof DeviceStatusSchema>

export const DeviceSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  phoneNumber: z.string().nullable(),
  status: DeviceStatusSchema,
  autoWarm: z.boolean(),
  warmProgress: z.number().int().min(0).max(100),
  lastSeenAt: z.string().datetime().nullable(),
  connectedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type Device = z.infer<typeof DeviceSchema>

export const CreateDeviceSchema = z.object({
  name: z.string().min(1).max(255),
  autoWarm: z.boolean().default(false),
})
export type CreateDeviceInput = z.infer<typeof CreateDeviceSchema>

export const DeviceQRSchema = z.object({
  deviceId: z.string().uuid(),
  qrCode: z.string().nullable(), // base64 data URI or null if already connected
  status: DeviceStatusSchema,
})
export type DeviceQR = z.infer<typeof DeviceQRSchema>
