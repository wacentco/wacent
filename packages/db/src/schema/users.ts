import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { plans } from './plans.js'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }),
  emailVerifiedAt: timestamp('email_verified_at'),
  planId: uuid('plan_id').references(() => plans.id),
  trialEndsAt: timestamp('trial_ends_at'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
