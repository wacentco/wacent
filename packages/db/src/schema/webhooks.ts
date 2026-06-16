import { boolean, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './users.js'

export const webhooks = pgTable('webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  url: text('url').notNull(),
  secretHash: varchar('secret_hash', { length: 255 }).notNull(),
  // e.g. ['message.sent','message.delivered','device.connected', ...]
  events: jsonb('events').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  failureCount: integer('failure_count').default(0).notNull(),
  lastTriggeredAt: timestamp('last_triggered_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
