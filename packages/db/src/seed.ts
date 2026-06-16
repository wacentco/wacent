import { db } from './client.js'
import { plans } from './schema/index.js'

const defaultPlans = [
  {
    name: 'starter',
    priceMonthly: 290,
    priceYearly: 2900,
    maxDevices: 1,
    features: {
      api: true,
      unlimitedMessages: true,
      webhooks: true,
      autoWarmer: false,
      campaigns: false,
      prioritySupport: false,
    },
  },
  {
    name: 'growth',
    priceMonthly: 790,
    priceYearly: 7900,
    maxDevices: 3,
    features: {
      api: true,
      unlimitedMessages: true,
      webhooks: true,
      autoWarmer: true,
      campaigns: false,
      prioritySupport: true,
    },
  },
  {
    name: 'scale',
    priceMonthly: 1990,
    priceYearly: 19900,
    maxDevices: 10,
    features: {
      api: true,
      unlimitedMessages: true,
      webhooks: true,
      autoWarmer: true,
      campaigns: true,
      prioritySupport: true,
    },
  },
]

async function main() {
  console.log('Seeding plans...')
  await db.insert(plans).values(defaultPlans).onConflictDoNothing()
  console.log('Seeded 3 plans: starter, growth, scale')
  process.exit(0)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
