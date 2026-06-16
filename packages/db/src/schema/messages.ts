import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { campaigns } from './campaigns.js'
import { devices } from './devices.js'
import { users } from './users.js'

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  deviceId: uuid('device_id').references(() => devices.id).notNull(),
  campaignId: uuid('campaign_id').references(() => campaigns.id),
  // outbound | inbound
  direction: varchar('direction', { length: 10 }).notNull(),
  toNumber: varchar('to_number', { length: 20 }),
  fromNumber: varchar('from_number', { length: 20 }),
  // text | image | video | audio | document | location
  type: varchar('type', { length: 20 }).notNull().default('text'),
  content: text('content'),
  mediaUrl: text('media_url'),
  caption: text('caption'),
  // queued | sent | delivered | read | failed
  status: varchar('status', { length: 20 }).notNull().default('queued'),
  waMessageId: varchar('wa_message_id', { length: 255 }),
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
