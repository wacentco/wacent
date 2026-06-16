import { db } from './client.js'
import { plans, users } from './schema/index.js'
import { eq } from 'drizzle-orm'
import { createHash } from 'crypto'

const defaultPlans = [
  {
    name: 'starter',
    priceMonthly: 590,
    priceYearly: 4900,
    maxDevices: 1,
    features: {
      api: true,
      webhooks: 1,
      apiKeys: 1,
      analytics: 'basic',
      autoWarmer: false,
      campaigns: false,
      contacts: false,
      csvImport: false,
      teamMembers: 1,
      sla: '99%',
      support: 'email',
      maxRecipientsPerDay: 300,
    },
  },
  {
    name: 'growth',
    priceMonthly: 1490,
    priceYearly: 12400,
    maxDevices: 5,
    features: {
      api: true,
      webhooks: 3,
      apiKeys: 3,
      analytics: 'full',
      autoWarmer: true,
      campaigns: false,
      contacts: true,
      csvImport: true,
      teamMembers: 3,
      sla: '99.5%',
      support: 'priority_email',
      maxRecipientsPerDay: 800,
    },
  },
  {
    name: 'scale',
    priceMonthly: 3490,
    priceYearly: 29000,
    maxDevices: 15,
    features: {
      api: true,
      webhooks: 10,
      apiKeys: 10,
      analytics: 'full',
      autoWarmer: true,
      campaigns: true,
      contacts: true,
      csvImport: true,
      teamMembers: 10,
      sla: '99.9%',
      support: 'priority_email',
      maxRecipientsPerDay: 2000,
    },
  },
  {
    name: 'agency',
    priceMonthly: 8900,
    priceYearly: 74000,
    maxDevices: 50,
    features: {
      api: true,
      webhooks: -1,
      apiKeys: -1,
      analytics: 'full',
      autoWarmer: true,
      campaigns: true,
      contacts: true,
      csvImport: true,
      teamMembers: -1,
      sla: '99.9%',
      support: 'dedicated',
      dedicatedSupport: true,
      customOnboarding: true,
      maxRecipientsPerDay: 5000,
    },
  },
]

// Simple bcrypt-compatible SHA-256 hash for the admin password seed.
// In production the auth routes use bcrypt — this seed is dev-only.
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

async function main() {
  console.log('Seeding plans...')
  for (const plan of defaultPlans) {
    const [existing] = await db
      .select({ id: plans.id })
      .from(plans)
      .where(eq(plans.name, plan.name))
      .limit(1)

    if (existing) {
      await db
        .update(plans)
        .set({
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          maxDevices: plan.maxDevices,
          features: plan.features,
        })
        .where(eq(plans.id, existing.id))
    } else {
      await db.insert(plans).values(plan)
    }
  }
  console.log('Seeded 4 plans: starter, growth, scale, agency')

  const adminEmail = process.env['ADMIN_EMAIL'] ?? 'admin@yourdomain.com'
  const adminPassword = process.env['ADMIN_PASSWORD'] ?? 'ChangeMe!2024'

  console.log('Seeding admin user...')
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1)

  if (!existing) {
    await db.insert(users).values({
      name: 'Admin',
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      role: 'admin',
    })
    console.log(`Admin user created: ${adminEmail}`)
  } else {
    console.log('Admin user already exists — skipping')
  }

  process.exit(0)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
