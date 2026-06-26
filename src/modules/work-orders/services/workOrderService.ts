import { prisma } from "@/lib/prisma/prisma";
import { WorkOrderInput, WorkOrderItemInput } from "../validations/workOrderSchemas";

const includeRelations = {
  client: { select: { id: true, name: true, code: true, address: true, city: true } },
  materials: { orderBy: { createdAt: "asc" as const } },
  encargadoRef: {
    select: {
      id: true,
      name: true,
      rut: true,
      client: { select: { id: true, name: true } },
    },
  },
};

function normalizeDates(data: any) {
  const out: any = { ...data };
  if (out.dueDate) out.dueDate = new Date(out.dueDate);
  if (out.fechaTrabajo) out.fechaTrabajo = new Date(out.fechaTrabajo);
  if (out.fechaEntrega) out.fechaEntrega = new Date(out.fechaEntrega);
  return out;
}

function parseDecimals(data: any) {
  const out: any = { ...data };
  for (const k of ["neto", "descuentoPorcentaje", "subtotalAfecto", "iva", "total"]) {
    if (out[k] !== undefined && out[k] !== null && out[k] !== "") {
      out[k] = parseFloat(out[k]);
    } else {
      out[k] = null;
    }
  }
  if (out.plazoDias !== undefined && out.plazoDias !== null && out.plazoDias !== "") {
    out.plazoDias = parseInt(out.plazoDias);
  } else {
    out.plazoDias = null;
  }
  return out;
}

export async function getWorkOrders() {
  return await prisma.workOrder.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: includeRelations,
  });
}

export async function getWorkOrderById(id: string) {
  return await prisma.workOrder.findUnique({
    where: { id, deletedAt: null },
    include: includeRelations,
  });
}

export async function createWorkOrder(data: WorkOrderInput, userId: string, items: WorkOrderItemInput[] = []) {
  const number = data.number?.trim() ? data.number : await generateWorkOrderNumber();
  const normalized = parseDecimals(normalizeDates(data));

  return await prisma.workOrder.create({
    data: {
      ...normalized,
      number,
      createdById: userId,
      materials: {
        create: items.map((it) => ({
          material: it.material,
          quantity: it.quantity,
          unit: it.unit || "UN",
          unitPrice: it.unitPrice ?? null,
          total: it.total ?? (it.unitPrice != null ? it.unitPrice * it.quantity : null),
        })),
      },
    },
    include: includeRelations,
  });
}

export async function updateWorkOrder(id: string, data: Partial<WorkOrderInput>, items: WorkOrderItemInput[] = []) {
  const normalized = parseDecimals(normalizeDates(data));
  return await prisma.$transaction(async (tx) => {
    await tx.workOrderMaterial.deleteMany({ where: { workOrderId: id } });
    return await tx.workOrder.update({
      where: { id },
      data: {
        ...normalized,
        materials: {
          create: items.map((it) => ({
            material: it.material,
            quantity: it.quantity,
            unit: it.unit || "UN",
            unitPrice: it.unitPrice ?? null,
            total: it.total ?? (it.unitPrice != null ? it.unitPrice * it.quantity : null),
          })),
        },
      },
      include: includeRelations,
    });
  });
}

export async function deleteWorkOrder(id: string) {
  return await prisma.workOrder.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function generateWorkOrderNumber() {
  const count = await prisma.workOrder.count();
  return `TRAB-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
}
