import { db } from '@wacent/db'
import { auditLogs } from '@wacent/db/schema'

interface AuditParams {
  userId: string | null
  action: string
  resource: string
  resourceId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, unknown>
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      metadata: params.metadata ?? null,
    })
  } catch {
    // Non-blocking — audit failures must not disrupt normal flow
  }
}
