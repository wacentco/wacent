import { boolean, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './users.js'

export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }),
  // disconnected | connecting | connected | banned
  status: varchar('status', { length: 30 }).notNull().default('disconnected'),
  sessionData: text('session_data'),  // AES-256-GCM encrypted Baileys auth state
  qrCode: text('qr_code'),           // cleared after connect
  autoWarm: boolean('auto_warm').default(false).notNull(),
  warmProgress: integer('warm_progress').default(0).notNull(), // 0–100
  lastSeenAt: timestamp('last_seen_at'),
  connectedAt: timestamp('connected_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
