import { prisma } from '../lib/prisma.js';
import type { AuditAction } from '@boilerplate/shared';

export interface AuditEntry {
  organizationId: string;
  userId: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: entry.organizationId,
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        metadata: (entry.metadata ?? {}) as object,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  } catch (err) {
    console.error('[audit] failed to write audit log:', err);
  }
}
