import { prisma } from "@/lib/prisma/prisma";
import { QuotationInput, QuotationItemInput } from "../validations/quotationSchemas";

export type QuotationItemPayload = QuotationItemInput & { type: "MATERIAL" | "WORK" };

export async function getQuotations() {
  return await prisma.quotation.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      items: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
    },
  });
}

export async function getQuotationById(id: string) {
  return await prisma.quotation.findUnique({
    where: { id, deletedAt: null },
    include: {
      client: { select: { id: true, name: true, code: true, address: true, city: true } },
      createdBy: { select: { id: true, name: true } },
      items: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
    },
  });
}

export async function createQuotation(
  data: QuotationInput,
  userId: string,
  items: QuotationItemPayload[] = []
) {
  const subtotal = data.subtotal ? parseFloat(data.subtotal) : 0;
  const tax = data.tax ? parseFloat(data.tax) : subtotal * 0.19;
  const total = data.total ? parseFloat(data.total) : subtotal + tax;

  const number = data.number && data.number.trim() ? data.number : await generateQuotationNumber();

  return await prisma.quotation.create({
    data: {
      number,
      clientId: data.clientId,
      status: data.status as any,
      validUntil: new Date(data.validUntil),
      subtotal,
      tax,
      total,
      discount: data.discount ? parseFloat(data.discount) : 0,
      discountType: (data.discountType as any) ?? "NONE",
      notes: data.notes,
      descripcionTrabajo: data.descripcionTrabajo,
      plazoEntrega: data.plazoEntrega,
      atencion: data.atencion,
      area: data.area,
      createdById: userId,
      items: {
        create: items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
          type: item.type,
        })),
      },
    },
    include: {
      client: { select: { id: true, name: true } },
      items: true,
    },
  });
}

export async function updateQuotation(
  id: string,
  data: Partial<QuotationInput>,
  items: QuotationItemPayload[] = []
) {
  const updateData: any = { ...data };

  if (data.validUntil) updateData.validUntil = new Date(data.validUntil);
  if (data.subtotal) updateData.subtotal = parseFloat(data.subtotal);
  if (data.tax) updateData.tax = parseFloat(data.tax);
  if (data.total) updateData.total = parseFloat(data.total);
  if (data.discount !== undefined) updateData.discount = parseFloat(data.discount);
  if (data.discountType) updateData.discountType = data.discountType;

  return await prisma.$transaction(async (tx) => {
    await tx.quotationItem.updateMany({
      where: { quotationId: id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    return await tx.quotation.update({
      where: { id },
      data: {
        ...updateData,
        items: {
          create: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
            type: item.type,
          })),
        },
      },
      include: {
        client: { select: { id: true, name: true } },
        items: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
      },
    });
  });
}

export async function deleteQuotation(id: string) {
  return await prisma.quotation.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function generateQuotationNumber() {
  const count = await prisma.quotation.count();
  return `COT-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
}
