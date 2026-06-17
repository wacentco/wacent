import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '@wacent/db'
import { contacts } from '@wacent/db/schema'
import { eq, and, or, ilike, desc, count } from 'drizzle-orm'
import { CreateContactSchema, UpdateContactSchema } from '@wacent/types'
import { flexAuth } from '../middleware/flexAuth.js'

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
})

const importSchema = z.object({
  contacts: z.array(
    z.object({
      phoneNumber: z.string().min(7).max(20),
      name: z.string().optional(),
      email: z.string().email().optional(),
      tags: z.array(z.string()).optional(),
    }),
  ).min(1).max(10_000),
})

export const contactRoutes = new Hono()

contactRoutes.use(flexAuth)

contactRoutes.get('/', zValidator('query', listQuerySchema), async (c) => {
  const { userId } = c.get('auth')
  const { page, limit, search } = c.req.valid('query')
  const offset = (page - 1) * limit

  const where = search
    ? and(
        eq(contacts.userId, userId),
        or(
          ilike(contacts.name, `%${search}%`),
          ilike(contacts.phoneNumber, `%${search}%`),
        ),
      )
    : eq(contacts.userId, userId)

  const [rows, [total]] = await Promise.all([
    db.select().from(contacts).where(where).orderBy(desc(contacts.createdAt)).limit(limit).offset(offset),
    db.select({ count: count() }).from(contacts).where(where),
  ])

  return c.json({ data: rows, meta: { page, limit, total: total?.count ?? 0 }, message: 'OK' })
})

contactRoutes.post('/', zValidator('json', CreateContactSchema), async (c) => {
  const { userId } = c.get('auth')
  const input = c.req.valid('json')

  const [contact] = await db
    .insert(contacts)
    .values({
      userId,
      phoneNumber: input.phoneNumber,
      name: input.name ?? null,
      email: input.email ?? null,
      tags: input.tags ?? null,
      metadata: input.metadata ?? null,
    })
    .returning()

  return c.json({ data: contact, message: 'Created' }, 201)
})

contactRoutes.get('/:id', async (c) => {
  const { userId } = c.get('auth')
  const id = c.req.param('id')

  const [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.userId, userId)))
    .limit(1)

  if (!contact) return c.json({ error: { code: 'NOT_FOUND', message: 'Contact not found' } }, 404)
  return c.json({ data: contact, message: 'OK' })
})

contactRoutes.put('/:id', zValidator('json', UpdateContactSchema), async (c) => {
  const { userId } = c.get('auth')
  const id = c.req.param('id')
  const input = c.req.valid('json')

  const [existing] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.userId, userId)))
    .limit(1)

  if (!existing) return c.json({ error: { code: 'NOT_FOUND', message: 'Contact not found' } }, 404)

  const updates: Partial<typeof contacts.$inferInsert> = { updatedAt: new Date() }
  if (input.phoneNumber !== undefined) updates.phoneNumber = input.phoneNumber
  if (input.name !== undefined) updates.name = input.name ?? null
  if (input.email !== undefined) updates.email = input.email ?? null
  if (input.tags !== undefined) updates.tags = input.tags ?? null
  if (input.metadata !== undefined) updates.metadata = input.metadata ?? null

  const [updated] = await db.update(contacts).set(updates).where(eq(contacts.id, id)).returning()
  return c.json({ data: updated, message: 'Updated' })
})

contactRoutes.delete('/:id', async (c) => {
  const { userId } = c.get('auth')
  const id = c.req.param('id')

  const [existing] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.userId, userId)))
    .limit(1)

  if (!existing) return c.json({ error: { code: 'NOT_FOUND', message: 'Contact not found' } }, 404)

  await db.delete(contacts).where(eq(contacts.id, id))
  return c.json({ data: null, message: 'Deleted' })
})

contactRoutes.post('/import', zValidator('json', importSchema), async (c) => {
  const { userId } = c.get('auth')
  const { contacts: rows } = c.req.valid('json')

  let created = 0
  const errors: Array<{ row: number; phone: string; reason: string }> = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!
    try {
      await db.insert(contacts).values({
        userId,
        phoneNumber: row.phoneNumber,
        name: row.name ?? null,
        email: row.email ?? null,
        tags: row.tags ?? null,
      })
      created++
    } catch (err) {
      errors.push({ row: i + 1, phone: row.phoneNumber, reason: err instanceof Error ? err.message : 'Unknown error' })
    }
  }

  return c.json({ data: { created, failed: errors.length, errors: errors.slice(0, 50) }, message: `Imported ${created} contacts` })
})
