import { integer, jsonb, pgTable, uuid, varchar } from 'drizzle-orm/pg-core'

export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull(), // starter|growth|scale|agency
  priceMonthly: integer('price_monthly').notNull(), // in cents
  priceYearly: integer('price_yearly').notNull(),
  maxDevices: integer('max_devices').notNull(),
  features: jsonb('features'),
})
