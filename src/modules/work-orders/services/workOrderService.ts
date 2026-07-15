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
  createdBy: { select: { id: true, name: true, phone: true } },
};

export class WorkOrderConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkOrderConflictError";
  }
}

/**
 * Throws WorkOrderConflictError if another work order already uses the same
 * nroFactura or nroGuia under a DIFFERENT client. Same numbers are allowed
 * when the OTs belong to the same client (legitimate repeat billing/guides
 * to one customer). Soft-deleted OTs are ignored.
 */
async function assertNoInvoiceGuideConflict(opts: {
  clientId?: string | null;
  nroFactura?: string | null;
  nroGuia?: string | null;
  excludeId?: string;
}) {
  const { clientId, nroFactura, nroGuia, excludeId } = opts;
  if (!clientId) return;

  const factura = nroFactura?.trim();
  const guia = nroGuia?.trim();
  if (!factura && !guia) return;

  const conflicts: string[] = [];

  if (factura) {
    const existing = await prisma.workOrder.findFirst({
      where: {
        nroFactura: factura,
        deletedAt: null,
        clientId: { not: clientId },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: {
        id: true,
        number: true,
        client: { select: { name: true } },
      },
    });
    if (existing) {
      conflicts.push(
        `N° de factura "${factura}" ya registrado en OT ${existing.number} (cliente: ${existing.client.name})`
      );
    }
  }

  if (guia) {
    const existing = await prisma.workOrder.findFirst({
      where: {
        nroGuia: guia,
        deletedAt: null,
        clientId: { not: clientId },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: {
        id: true,
        number: true,
        client: { select: { name: true } },
      },
    });
    if (existing) {
      conflicts.push(
        `N° de guía "${guia}" ya registrado en OT ${existing.number} (cliente: ${existing.client.name})`
      );
    }
  }

  if (conflicts.length > 0) {
    throw new WorkOrderConflictError(conflicts.join(". "));
  }
}

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

  await assertNoInvoiceGuideConflict({
    clientId: normalized.clientId,
    nroFactura: normalized.nroFactura,
    nroGuia: normalized.nroGuia,
  });

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
  // Only validate when the payload actually carries a factura/guia value
  // (skip when the user is editing other fields and not touching these).
  if (data.nroFactura || data.nroGuia) {
    const existing = await prisma.workOrder.findUnique({
      where: { id },
      select: { clientId: true },
    });
    if (!existing) throw new Error(`WorkOrder ${id} not found`);

    await assertNoInvoiceGuideConflict({
      clientId: data.clientId ?? existing.clientId,
      nroFactura: data.nroFactura,
      nroGuia: data.nroGuia,
      excludeId: id,
    });
  }

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

export async function updateWorkOrderStatus(id: string, status: string) {
  return await prisma.workOrder.update({
    where: { id },
    data: { status: status as any },
    include: includeRelations,
  });
}

export async function generateWorkOrderNumber() {
  const count = await prisma.workOrder.count();
  return `TRAB-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
}
