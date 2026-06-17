import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
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
  role: varchar('role', { length: 20 }).notNull().default('user'), // user | admin
  googleId: varchar('google_id', { length: 255 }).unique(),
  avatarUrl: text('avatar_url'),
  authProvider: varchar('auth_provider', { length: 20 }).notNull().default('email'), // email | google
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  suspendedAt: timestamp('suspended_at', { withTimezone: true }),
  suspendReason: text('suspend_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
