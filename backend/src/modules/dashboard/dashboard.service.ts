import { prisma } from '../../lib/prisma.js';
import type { AuthUser } from '@boilerplate/shared';

export const dashboardService = {
  async getSummary(actor: AuthUser) {
    const [userCount, departmentCount] = await prisma.$transaction([
      prisma.user.count({
        where: { organizationId: actor.organizationId, deletedAt: null },
      }),
      prisma.department.count({
        where: { organizationId: actor.organizationId, deletedAt: null },
      }),
    ]);

    return {
      users: userCount,
      departments: departmentCount,
    };
  },
};
