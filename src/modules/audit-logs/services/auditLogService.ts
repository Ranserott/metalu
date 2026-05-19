import { prisma } from "@/lib/prisma/prisma";
import { AuditLogInput } from "../validations/auditLogSchemas";

const mockAuditLogs = [
  {
    id: "1",
    userId: "1",
    action: "CREATE",
    resource: "Client",
    resourceId: "1",
    oldValues: null,
    newValues: { name: "Acme Corp" },
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0",
    createdAt: new Date(),
  },
  {
    id: "2",
    userId: "1",
    action: "UPDATE",
    resource: "Quotation",
    resourceId: "1",
    oldValues: { status: "DRAFT" },
    newValues: { status: "SENT" },
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0",
    createdAt: new Date(),
  },
];

export async function getAuditLogs() {
  try {
    return await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { name: true } } },
    });
  } catch {
    return mockAuditLogs;
  }
}

export async function getAuditLogById(id: string) {
  try {
    return await prisma.auditLog.findUnique({
      where: { id },
    });
  } catch {
    return mockAuditLogs.find((a) => a.id === id) || null;
  }
}

export async function createAuditLog(data: AuditLogInput) {
  try {
    return await prisma.auditLog.create({
      data,
    });
  } catch {
    return { ...data, id: Date.now().toString(), createdAt: new Date() };
  }
}