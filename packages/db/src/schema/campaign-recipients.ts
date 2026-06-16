import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { campaigns } from './campaigns.js'
import { contacts } from './contacts.js'
import { messages } from './messages.js'

export const campaignRecipients = pgTable('campaign_recipients', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => campaigns.id).notNull(),
  contactId: uuid('contact_id').references(() => contacts.id),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
  // pending | sent | failed
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  messageId: uuid('message_id').references(() => messages.id),
  errorMessage: text('error_message'),
  processedAt: timestamp('processed_at'),
})
