import { prisma } from "@/lib/prisma/prisma";

export async function getDashboardStats() {
  const [
    totalClients,
    activeWorkOrders,
    pendingQuotations,
    overdueInvoices,
  ] = await Promise.all([
    prisma.client.count({ where: { isActive: true, deletedAt: null } }),
    prisma.workOrder.count({ where: { status: { in: ["TODO", "IN_PROGRESS"] }, deletedAt: null } }),
    prisma.quotation.count({ where: { status: "SENT", deletedAt: null } }),
    prisma.invoice.count({ where: { status: "OVERDUE", deletedAt: null } }),
  ]);

  return {
    totalClients,
    activeWorkOrders,
    pendingQuotations,
    overdueInvoices,
  };
}

export async function getRecentActivity(limit = 10) {
  return prisma.activityLog.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
  });
}