import { integer, pgTable, primaryKey, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { contacts } from './contacts.js'

export const contactLists = pgTable('contact_lists', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  contactCount: integer('contact_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const contactListMembers = pgTable(
  'contact_list_members',
  {
    listId: uuid('list_id').references(() => contactLists.id, { onDelete: 'cascade' }).notNull(),
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'cascade' }).notNull(),
    addedAt: timestamp('added_at').defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.listId, t.contactId] })],
)
