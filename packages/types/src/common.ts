import { z } from 'zod'

export const PaginationMetaSchema = z.object({
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
})
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
})
export type ApiError = z.infer<typeof ApiErrorSchema>

// Generic envelope helpers — call at definition site, not at runtime
export function apiListSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    data: z.array(item),
    meta: PaginationMetaSchema,
    message: z.string(),
  })
}

export function apiSingleSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    data: item,
    message: z.string(),
  })
}

// Phone number: E.164 format (+628123456789)
export const E164Schema = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format (e.g. +628123456789)')
