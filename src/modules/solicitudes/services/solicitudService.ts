import { prisma } from "@/lib/prisma/prisma";
import {
  SolicitudInput,
  SolicitudReviewInput,
} from "../validations/solicitudSchemas";
import { SolicitudStatus } from "../types/solicitud";

const TAX_RATE = 0.19; // IVA Chile

const INCLUDE_BASE = {
  workOrder: { select: { number: true, title: true } },
  client: { select: { name: true, code: true } },
  supplier: { select: { name: true } },
};

const INCLUDE_FULL = {
  ...INCLUDE_BASE,
  items: { where: { deletedAt: null }, orderBy: { createdAt: "asc" as const } },
};

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

async function nextSolicitudNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SOL-${year}-`;
  const last = await prisma.solicitudOrdenCompra.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
  });
  const lastSeq = last ? parseInt(last.number.slice(prefix.length), 10) : 0;
  return `${prefix}${String(lastSeq + 1).padStart(3, "0")}`;
}

async function nextPurchaseNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `OC-${year}-`;
  const last = await prisma.purchase.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
  });
  const lastSeq = last ? parseInt(last.number.slice(prefix.length), 10) : 0;
  return `${prefix}${String(lastSeq + 1).padStart(3, "0")}`;
}

export async function getSolicitudes(opts: { status?: SolicitudStatus; workOrderId?: string } = {}) {
  return prisma.solicitudOrdenCompra.findMany({
    where: {
      deletedAt: null,
      ...(opts.status && { status: opts.status }),
      ...(opts.workOrderId && { workOrderId: opts.workOrderId }),
    },
    include: {
      ...INCLUDE_BASE,
      _count: { select: { items: { where: { deletedAt: null } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSolicitudById(id: string) {
  return prisma.solicitudOrdenCompra.findFirst({
    where: { id, deletedAt: null },
    include: INCLUDE_FULL,
  });
}

export async function createSolicitud(data: SolicitudInput, userId: string) {
  // Validate workOrder and client exist and are not soft-deleted
  const wo = await prisma.workOrder.findFirst({
    where: { id: data.workOrderId, deletedAt: null },
  });
  if (!wo) throw new Error("Trabajo no encontrado");

  const client = await prisma.client.findFirst({
    where: { id: data.clientId, deletedAt: null },
  });
  if (!client) throw new Error("Cliente no encontrado");

  const number = await nextSolicitudNumber();
  const diasSinOC = Math.max(0, daysBetween(data.fechaTrabajo, new Date()));

  return prisma.solicitudOrdenCompra.create({
    data: {
      number,
      workOrderId: data.workOrderId,
      clientId: data.clientId,
      fechaTrabajo: data.fechaTrabajo,
      fechaEntrega: data.fechaEntrega,
      diasSinOC,
      solicitud1: data.solicitud1 ?? null,
      solicitud2: data.solicitud2 ?? null,
      solicitud3: data.solicitud3 ?? null,
      notasInternas: data.notasInternas ?? null,
      status: "SOLICITUD_GENERADA",
      createdById: userId,
    },
    include: INCLUDE_BASE,
  });
}

export async function updateSolicitud(
  id: string,
  data: Partial<SolicitudInput>,
  _userId: string
) {
  const existing = await prisma.solicitudOrdenCompra.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw new Error("Solicitud no encontrada");
  if (
    existing.status !== "SOLICITUD_GENERADA" &&
    existing.status !== "EN_REVISION"
  ) {
    throw new Error("La solicitud no es editable en su estado actual");
  }

  const updateData: any = {};
  if (data.workOrderId !== undefined) updateData.workOrderId = data.workOrderId;
  if (data.clientId !== undefined) updateData.clientId = data.clientId;
  if (data.fechaTrabajo !== undefined) {
    updateData.fechaTrabajo = data.fechaTrabajo;
    updateData.diasSinOC = Math.max(0, daysBetween(data.fechaTrabajo, new Date()));
  }
  if (data.fechaEntrega !== undefined) updateData.fechaEntrega = data.fechaEntrega;
  if (data.solicitud1 !== undefined) updateData.solicitud1 = data.solicitud1;
  if (data.solicitud2 !== undefined) updateData.solicitud2 = data.solicitud2;
  if (data.solicitud3 !== undefined) updateData.solicitud3 = data.solicitud3;
  if (data.notasInternas !== undefined) updateData.notasInternas = data.notasInternas;

  return prisma.solicitudOrdenCompra.update({
    where: { id },
    data: updateData,
    include: INCLUDE_BASE,
  });
}

export async function updateSolicitudReview(
  id: string,
  data: SolicitudReviewInput,
  _userId: string
) {
  const existing = await prisma.solicitudOrdenCompra.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw new Error("Solicitud no encontrada");
  if (existing.status !== "EN_REVISION") {
    throw new Error("La solicitud no está en revisión");
  }

  // Verify supplier exists
  const supplier = await prisma.supplier.findFirst({
    where: { id: data.supplierId, deletedAt: null },
  });
  if (!supplier) throw new Error("Proveedor no encontrado");

  // Compute subtotal and total
  const subtotal = data.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const discount = data.discount ?? 0;
  const discountType = data.discountType ?? "NONE";
  let discountAmount = 0;
  if (discountType === "AMOUNT") discountAmount = discount;
  else if (discountType === "PERCENT") discountAmount = subtotal * (discount / 100);
  const taxable = Math.max(0, subtotal - discountAmount);
  const tax = taxable * TAX_RATE;
  const total = taxable + tax;

  return prisma.$transaction(async (tx) => {
    // Soft-delete previous items
    await tx.solicitudItem.updateMany({
      where: { solicitudId: id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    // Create new items
    await tx.solicitudItem.createMany({
      data: data.items.map((item) => ({
        solicitudId: id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
      })),
    });
    // Update solicitud
    return tx.solicitudOrdenCompra.update({
      where: { id },
      data: {
        supplierId: data.supplierId,
        subtotal,
        tax,
        total,
        discount,
        discountType,
      },
      include: INCLUDE_FULL,
    });
  });
}

export async function transitionSolicitud(
  id: string,
  action: "submit" | "approve" | "reject" | "cancel",
  userId: string,
  isAdmin: boolean,
  reason?: string
) {
  const existing = await prisma.solicitudOrdenCompra.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw new Error("Solicitud no encontrada");

  const isCreator = existing.createdById === userId;
  const today = new Date();

  if (action === "submit") {
    if (existing.status !== "SOLICITUD_GENERADA")
      throw new Error(`Transición no permitida: ${existing.status} → submit`);
    if (!isCreator && !isAdmin)
      throw new Error("No tienes permiso para hacer submit de esta solicitud");
    return prisma.solicitudOrdenCompra.update({
      where: { id },
      data: { status: "EN_REVISION" },
      include: INCLUDE_BASE,
    });
  }

  if (action === "approve") {
    if (!isAdmin) throw new Error("Solo administradores pueden aprobar");
    if (existing.status !== "EN_REVISION")
      throw new Error(`Transición no permitida: ${existing.status} → approve`);
    if (!existing.supplierId)
      throw new Error(
        "Falta seleccionar proveedor y al menos 1 item antes de aprobar"
      );
    const itemCount = await prisma.solicitudItem.count({
      where: { solicitudId: id, deletedAt: null },
    });
    if (itemCount === 0)
      throw new Error(
        "Falta seleccionar proveedor y al menos 1 item antes de aprobar"
      );

    return prisma.$transaction(async (tx) => {
      const purchaseNumber = await nextPurchaseNumber();
      const items = await tx.solicitudItem.findMany({
        where: { solicitudId: id, deletedAt: null },
        orderBy: { createdAt: "asc" },
      });
      const purchase = await tx.purchase.create({
        data: {
          // discount info lives on the parent Solicitud; Purchase stores the final total
          number: purchaseNumber,
          supplierId: existing.supplierId!,
          status: "SENT",
          subtotal: existing.subtotal ?? 0,
          tax: existing.tax ?? 0,
          total: existing.total ?? 0,
          createdById: userId,
          items: {
            create: items.map((it) => ({
              description: it.description,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              total: it.total,
            })),
          },
        },
      });
      return tx.solicitudOrdenCompra.update({
        where: { id },
        data: {
          status: "ORDEN_EMITIDA",
          purchaseId: purchase.id,
        },
        include: { ...INCLUDE_BASE, purchase: { select: { id: true, number: true } } },
      });
    });
  }

  if (action === "reject") {
    if (!isAdmin) throw new Error("Solo administradores pueden rechazar");
    if (existing.status !== "EN_REVISION")
      throw new Error(`Transición no permitida: ${existing.status} → reject`);
    if (!reason || reason.trim().length === 0)
      throw new Error("Motivo de rechazo requerido");
    return prisma.solicitudOrdenCompra.update({
      where: { id },
      data: {
        status: "RECHAZADA",
        rejectionReason: reason,
        rejectedById: userId,
        rejectedAt: today,
      },
      include: INCLUDE_BASE,
    });
  }

  if (action === "cancel") {
    if (!isCreator && !isAdmin)
      throw new Error("No tienes permiso para cancelar esta solicitud");
    if (existing.status !== "SOLICITUD_GENERADA" && existing.status !== "EN_REVISION")
      throw new Error(`Transición no permitida: ${existing.status} → cancel`);
    return prisma.solicitudOrdenCompra.update({
      where: { id },
      data: { status: "CANCELADA" },
      include: INCLUDE_BASE,
    });
  }

  throw new Error("Acción no reconocida");
}

export async function deleteSolicitud(id: string, userId: string) {
  const existing = await prisma.solicitudOrdenCompra.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw new Error("Solicitud no encontrada");
  if (existing.status === "ORDEN_EMITIDA")
    throw new Error("No se puede eliminar una solicitud ya emitida");
  if (existing.createdById !== userId)
    throw new Error("No tienes permiso para eliminar esta solicitud");
  return prisma.solicitudOrdenCompra.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
