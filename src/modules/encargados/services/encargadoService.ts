import { prisma } from "@/lib/prisma/prisma";
import { EncargadoInputValidated } from "../validations/encargadoSchemas";

const includeClient = {
  client: { select: { id: true, name: true, code: true } },
  createdBy: { select: { name: true } },
};

export async function getEncargados(opts?: { clientId?: string }) {
  return prisma.encargado.findMany({
    where: {
      deletedAt: null,
      ...(opts?.clientId ? { clientId: opts.clientId } : {}),
    },
    orderBy: { name: "asc" },
    include: includeClient,
  });
}

export async function getEncargadoById(id: string) {
  return prisma.encargado.findUnique({
    where: { id, deletedAt: null },
    include: includeClient,
  });
}

export async function createEncargado(
  data: EncargadoInputValidated,
  userId: string,
) {
  const client = await prisma.client.findUnique({
    where: { id: data.clientId, deletedAt: null },
  });
  if (!client) {
    throw new Error("Cliente inválido");
  }

  const existing = await prisma.encargado.findFirst({
    where: { rut: data.rut, deletedAt: null },
  });
  if (existing) {
    throw new Error("Ya existe un encargado con ese RUT");
  }

  return prisma.encargado.create({
    data: { ...data, createdById: userId },
    include: includeClient,
  });
}

export async function updateEncargado(
  id: string,
  data: Partial<EncargadoInputValidated>,
) {
  if (data.clientId) {
    const client = await prisma.client.findUnique({
      where: { id: data.clientId, deletedAt: null },
    });
    if (!client) {
      throw new Error("Cliente inválido");
    }
  }

  if (data.rut) {
    const existing = await prisma.encargado.findFirst({
      where: { rut: data.rut, deletedAt: null, NOT: { id } },
    });
    if (existing) {
      throw new Error("Ya existe un encargado con ese RUT");
    }
  }

  return prisma.encargado.update({
    where: { id },
    data,
    include: includeClient,
  });
}

export async function deleteEncargado(id: string) {
  const activeWorkOrders = await prisma.workOrder.count({
    where: { encargadoId: id, deletedAt: null },
  });
  if (activeWorkOrders > 0) {
    throw new Error(
      `Tiene ${activeWorkOrders} trabajo(s) asociado(s), no se puede eliminar`,
    );
  }

  return prisma.encargado.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
