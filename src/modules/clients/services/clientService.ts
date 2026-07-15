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

// <input type="date"> posts a date-only string ("YYYY-MM-DD") but Prisma's
// DateTime field rejects it as a premature ISO-8601. Normalize at the service
// boundary so the rest of the app can keep accepting strings from the form.
function normalizeDateInput(v: string | undefined): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === "") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T00:00:00.000Z`);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
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
  const { lastPaymentDate, ...rest } = data;
  return prisma.client.create({
    data: {
      ...rest,
      lastPaymentDate: normalizeDateInput(lastPaymentDate) ?? null,
      createdById: userId,
    },
  });
}

export async function updateClient(id: string, data: Partial<ClientInput>) {
  await assertParentClient(data.parentClientId, id);
  const { lastPaymentDate, ...rest } = data;
  return prisma.client.update({
    where: { id },
    data: {
      ...rest,
      ...(lastPaymentDate !== undefined
        ? { lastPaymentDate: normalizeDateInput(lastPaymentDate) }
        : {}),
    },
  });
}

export async function deleteClient(id: string) {
  return prisma.client.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}