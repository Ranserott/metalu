import { prisma } from "@/lib/prisma/prisma";
import { ClientInput } from "../validations/clientSchemas";

async function assertParentClient(parentClientId: string | null | undefined, currentClientId?: string) {
  if (!parentClientId) return;
  if (parentClientId === currentClientId) {
    throw new Error("Un cliente no puede ser su propia empresa padre");
  }

  const parent = await prisma.client.findFirst({
    where: { id: parentClientId, deletedAt: null },
    select: { id: true },
  });
  if (!parent) throw new Error("La empresa padre no existe");
}

export async function getClients(opts?: { activeOnly?: boolean }) {
  return prisma.client.findMany({
    where: {
      deletedAt: null,
      ...(opts?.activeOnly ? { isActive: true } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      parent: { select: { id: true, code: true, name: true, isActive: true } },
    },
  });
}

export async function getClientById(id: string) {
  return prisma.client.findUnique({
    where: { id, deletedAt: null },
    include: {
      createdBy: { select: { name: true } },
      parent: { select: { id: true, code: true, name: true, isActive: true } },
      children: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: { id: true, code: true, name: true, isActive: true },
      },
      quotations: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, number: true, status: true, total: true, createdAt: true },
      },
      invoices: {
        where: { deletedAt: null },
        orderBy: { issueDate: "desc" },
        take: 10,
        select: { id: true, number: true, status: true, total: true, issueDate: true, dueDate: true },
      },
    },
  });
}

export async function createClient(data: ClientInput, userId: string) {
  await assertParentClient(data.parentClientId);
  return prisma.client.create({
    data: {
      ...data,
      createdById: userId,
    },
  });
}

export async function updateClient(id: string, data: Partial<ClientInput>) {
  await assertParentClient(data.parentClientId, id);
  return prisma.client.update({
    where: { id },
    data,
  });
}

export async function deleteClient(id: string) {
  return prisma.client.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}