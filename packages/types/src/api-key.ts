import { z } from 'zod'

export const ApiKeySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  prefix: z.string(), // e.g. "wz_live_ab12"
  lastUsedAt: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
})
export type ApiKey = z.infer<typeof ApiKeySchema>

// Returned once immediately after creation — includes the full plaintext key
export const CreatedApiKeySchema = ApiKeySchema.extend({
  key: z.string(),
})
export type CreatedApiKey = z.infer<typeof CreatedApiKeySchema>

export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(255),
})
export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>
