import type { SQL } from 'drizzle-orm'
import { eq } from 'drizzle-orm'

/**
 * Returns a WHERE condition that scopes a query to the authenticated user.
 * Every query on user-owned tables must pass through this helper to prevent
 * cross-tenant data access.
 */
export function withUserScope(userIdColumn: Parameters<typeof eq>[0], userId: string): SQL {
  return eq(userIdColumn, userId)
}
