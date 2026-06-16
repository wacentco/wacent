import { z } from 'zod'
import { E164Schema } from './common.js'

export const ContactSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  phoneNumber: z.string(),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  tags: z.array(z.string()).nullable(),
  metadata: z.record(z.unknown()).nullable(),
  waSynced: z.boolean(),
  waProfileName: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type Contact = z.infer<typeof ContactSchema>

export const CreateContactSchema = z.object({
  phoneNumber: E164Schema,
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
})
export type CreateContactInput = z.infer<typeof CreateContactSchema>

export const UpdateContactSchema = CreateContactSchema.partial()
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>
