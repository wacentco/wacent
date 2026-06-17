import { db } from './client.js'
import { plans, users, subscriptions } from './schema/index.js'
import { eq, sql } from 'drizzle-orm'

async function main() {
  const [starterPlan] = await db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.name, 'starter'))
    .limit(1)

  if (!starterPlan) {
    console.error('Starter plan not found. Run `pnpm db:seed` first.')
    process.exit(1)
  }

  const usersWithoutSub = await db
    .select({ id: users.id })
    .from(users)
    .where(
      sql`${users.role} = 'user' AND ${users.id} NOT IN (SELECT user_id FROM subscriptions)`,
    )

  console.log(`Found ${usersWithoutSub.length} user(s) without a subscription.`)
  if (usersWithoutSub.length === 0) {
    process.exit(0)
  }

  const now = new Date()
  const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

  for (const user of usersWithoutSub) {
    await db.insert(subscriptions).values({
      userId: user.id,
      planId: starterPlan.id,
      status: 'trialing',
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
    })
    await db.update(users).set({ planId: starterPlan.id }).where(eq(users.id, user.id))
    console.log(`  Assigned trial to user ${user.id}`)
  }

  console.log(`Done. Assigned starter trial to ${usersWithoutSub.length} user(s).`)
  process.exit(0)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
