import { prisma } from "@/lib/prisma/prisma";
import { ClientInput } from "../validations/clientSchemas";

export async function getClients() {
  return prisma.client.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });
}

export async function getClientById(id: string) {
  return prisma.client.findUnique({
    where: { id, deletedAt: null },
    include: {
      createdBy: { select: { name: true } },
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
  return prisma.client.create({
    data: {
      ...data,
      createdById: userId,
    },
  });
}

export async function updateClient(id: string, data: Partial<ClientInput>) {
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