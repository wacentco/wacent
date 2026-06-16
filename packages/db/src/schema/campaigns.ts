import { boolean, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { devices } from './devices.js'
import { users } from './users.js'

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  deviceId: uuid('device_id').references(() => devices.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  // draft | scheduled | sending | paused | completed | failed
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  messageType: varchar('message_type', { length: 20 }).notNull().default('text'),
  content: text('content'),
  mediaUrl: text('media_url'),
  caption: text('caption'),
  recipientCount: integer('recipient_count').default(0).notNull(),
  sentCount: integer('sent_count').default(0).notNull(),
  deliveredCount: integer('delivered_count').default(0).notNull(),
  readCount: integer('read_count').default(0).notNull(),
  failedCount: integer('failed_count').default(0).notNull(),
  scheduledAt: timestamp('scheduled_at'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  delayMs: integer('delay_ms').notNull().default(1500), // anti-spam delay
  optinConfirmed: boolean('optin_confirmed').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
