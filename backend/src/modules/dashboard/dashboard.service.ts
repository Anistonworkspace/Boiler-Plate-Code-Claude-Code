import { prisma } from '../../lib/prisma.js';
import type { AuthUser } from '@boilerplate/shared';

export const dashboardService = {
  async getSummary(actor: AuthUser) {
    const [userCount, departmentCount, recentLogs] = await prisma.$transaction([
      prisma.user.count({
        where: { organizationId: actor.organizationId, deletedAt: null },
      }),
      prisma.department.count({
        where: { organizationId: actor.organizationId, deletedAt: null },
      }),
      prisma.auditLog.findMany({
        where: { organizationId: actor.organizationId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, action: true, resource: true, createdAt: true },
      }),
    ]);

    return {
      userCount,
      departmentCount,
      recentActivity: recentLogs.map((log) => ({
        id: log.id,
        message: `${log.action} ${log.resource}`,
        createdAt: log.createdAt.toISOString(),
      })),
    };
  },
};
