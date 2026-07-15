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
  const draftWhere = {
    status: "DRAFT" as const,
    deletedAt: null,
    ...(scope?.userId ? { createdById: scope.userId } : {}),
  };

  const [activeWorkOrders, pendingQuotations, draftWorkOrders] = await Promise.all([
    prisma.workOrder.count({ where: woWhere }),
    prisma.quotation.count({ where: qWhere }),
    prisma.workOrder.count({ where: draftWhere }),
  ]);

  return { activeWorkOrders, pendingQuotations, draftWorkOrders };
}

export async function getRecentActivity(limit = 10, scope?: DashboardScope) {
  return prisma.activityLog.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    where: scope?.userId ? { userId: scope.userId } : undefined,
    include: { user: { select: { name: true } } },
  });
}

export type PendingDraftWorkOrder = {
  id: string;
  number: string;
  title: string;
  createdAt: Date;
  client: { id: string; name: string };
  createdBy: { id: string; name: string } | null;
};

export async function getPendingDraftWorkOrders(
  limit = 10
): Promise<PendingDraftWorkOrder[]> {
  return prisma.workOrder.findMany({
    where: { status: "DRAFT", deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      client: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
}