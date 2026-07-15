import { prisma } from "@/lib/prisma/prisma";

type DashboardScope = { userId?: string };

export async function getDashboardStats(scope?: DashboardScope) {
  const woWhere = {
    status: { in: ["TODO", "IN_PROGRESS"] as const },
    deletedAt: null,
    ...(scope?.userId ? { createdById: scope.userId } : {}),
  };
  const qWhere = {
    status: "SENT" as const,
    deletedAt: null,
    ...(scope?.userId ? { createdById: scope.userId } : {}),
  };

  const [activeWorkOrders, pendingQuotations] = await Promise.all([
    prisma.workOrder.count({ where: woWhere }),
    prisma.quotation.count({ where: qWhere }),
  ]);

  return { activeWorkOrders, pendingQuotations };
}

export async function getRecentActivity(limit = 10, scope?: DashboardScope) {
  return prisma.activityLog.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    where: scope?.userId ? { userId: scope.userId } : undefined,
    include: { user: { select: { name: true } } },
  });
}