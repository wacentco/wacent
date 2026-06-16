import { date, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core'
import { devices } from './devices.js'
import { users } from './users.js'

export const usageLogs = pgTable('usage_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  deviceId: uuid('device_id').references(() => devices.id).notNull(),
  date: date('date').notNull(),
  messagesSent: integer('messages_sent').default(0).notNull(),
  messagesReceived: integer('messages_received').default(0).notNull(),
  messagesDelivered: integer('messages_delivered').default(0).notNull(),
  messagesRead: integer('messages_read').default(0).notNull(),
  messagesFailed: integer('messages_failed').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
