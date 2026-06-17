import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '@wacent/db'
import { contactLists, contactListMembers, contacts } from '@wacent/db/schema'
import { eq, and, desc, count, sql } from 'drizzle-orm'
import { flexAuth } from '../middleware/flexAuth.js'

const createListSchema = z.object({ name: z.string().min(1).max(255) })

const addMembersSchema = z.object({
  contactIds: z.array(z.string().uuid()).min(1).max(1000),
})

const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const contactListRoutes = new Hono()

contactListRoutes.use(flexAuth)

contactListRoutes.get('/', async (c) => {
  const { userId } = c.get('auth')

  const rows = await db
    .select()
    .from(contactLists)
    .where(eq(contactLists.userId, userId))
    .orderBy(desc(contactLists.createdAt))

  return c.json({ data: rows, message: 'OK' })
})

contactListRoutes.post('/', zValidator('json', createListSchema), async (c) => {
  const { userId } = c.get('auth')
  const { name } = c.req.valid('json')

  const [list] = await db.insert(contactLists).values({ userId, name }).returning()
  return c.json({ data: list, message: 'Created' }, 201)
})

contactListRoutes.delete('/:id', async (c) => {
  const { userId } = c.get('auth')
  const id = c.req.param('id')

  const [existing] = await db
    .select({ id: contactLists.id })
    .from(contactLists)
    .where(and(eq(contactLists.id, id), eq(contactLists.userId, userId)))
    .limit(1)

  if (!existing) return c.json({ error: { code: 'NOT_FOUND', message: 'List not found' } }, 404)

  await db.delete(contactLists).where(eq(contactLists.id, id))
  return c.json({ data: null, message: 'Deleted' })
})

contactListRoutes.get('/:id/members', zValidator('query', pageSchema), async (c) => {
  const { userId } = c.get('auth')
  const id = c.req.param('id')
  const { page, limit } = c.req.valid('query')

  const [list] = await db
    .select({ id: contactLists.id })
    .from(contactLists)
    .where(and(eq(contactLists.id, id), eq(contactLists.userId, userId)))
    .limit(1)

  if (!list) return c.json({ error: { code: 'NOT_FOUND', message: 'List not found' } }, 404)

  const rows = await db
    .select({ contact: contacts })
    .from(contactListMembers)
    .innerJoin(contacts, eq(contacts.id, contactListMembers.contactId))
    .where(eq(contactListMembers.listId, id))
    .limit(limit)
    .offset((page - 1) * limit)

  return c.json({ data: rows.map((r) => r.contact), meta: { page, limit }, message: 'OK' })
})

contactListRoutes.post('/:id/members', zValidator('json', addMembersSchema), async (c) => {
  const { userId } = c.get('auth')
  const id = c.req.param('id')
  const { contactIds } = c.req.valid('json')

  const [list] = await db
    .select({ id: contactLists.id })
    .from(contactLists)
    .where(and(eq(contactLists.id, id), eq(contactLists.userId, userId)))
    .limit(1)

  if (!list) return c.json({ error: { code: 'NOT_FOUND', message: 'List not found' } }, 404)

  await db
    .insert(contactListMembers)
    .values(contactIds.map((contactId) => ({ listId: id, contactId })))
    .onConflictDoNothing()

  // Sync contact count
  const countResult = await db
    .select({ total: count() })
    .from(contactListMembers)
    .where(eq(contactListMembers.listId, id))

  await db.update(contactLists).set({ contactCount: countResult[0]?.total ?? 0, updatedAt: new Date() }).where(eq(contactLists.id, id))

  return c.json({ data: { added: contactIds.length }, message: 'Members added' })
})

contactListRoutes.delete('/:id/members/:contactId', async (c) => {
  const { userId } = c.get('auth')
  const id = c.req.param('id')
  const contactId = c.req.param('contactId')

  const [list] = await db
    .select({ id: contactLists.id })
    .from(contactLists)
    .where(and(eq(contactLists.id, id), eq(contactLists.userId, userId)))
    .limit(1)

  if (!list) return c.json({ error: { code: 'NOT_FOUND', message: 'List not found' } }, 404)

  await db
    .delete(contactListMembers)
    .where(and(eq(contactListMembers.listId, id), eq(contactListMembers.contactId, contactId)))

  const countResult2 = await db
    .select({ total: count() })
    .from(contactListMembers)
    .where(eq(contactListMembers.listId, id))

  await db.update(contactLists).set({ contactCount: countResult2[0]?.total ?? 0, updatedAt: new Date() }).where(eq(contactLists.id, id))

  return c.json({ data: null, message: 'Member removed' })
})

// Convenience: get all phone numbers in a list (for campaign use)
contactListRoutes.get('/:id/phones', async (c) => {
  const { userId } = c.get('auth')
  const id = c.req.param('id')

  const [list] = await db
    .select({ id: contactLists.id })
    .from(contactLists)
    .where(and(eq(contactLists.id, id), eq(contactLists.userId, userId)))
    .limit(1)

  if (!list) return c.json({ error: { code: 'NOT_FOUND', message: 'List not found' } }, 404)

  const rows = await db
    .select({ phoneNumber: contacts.phoneNumber })
    .from(contactListMembers)
    .innerJoin(contacts, eq(contacts.id, contactListMembers.contactId))
    .where(and(eq(contactListMembers.listId, id), sql`${contacts.phoneNumber} is not null`))

  return c.json({ data: rows.map((r) => r.phoneNumber), message: 'OK' })
})
