import { prisma } from "@/lib/prisma/prisma";
import { SupplierDocumentInput } from "../validations/paymentSchemas";

export type SupplierDocument = {
  id: string;
  number: string;
  supplierId: string | null;
  supplier: { id: string; code: string; name: string } | null;
  documentType: string | null;
  documentNumber: string | null;
  documentDate: Date | null;
  dueDate: Date | null;
  amount: import("@prisma/client/runtime/library").Decimal;
  status: string;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function getSupplierDocuments() {
  return await prisma.payment.findMany({
    where: {
      deletedAt: null,
      supplierId: { not: null },
    },
    include: { supplier: { select: { id: true, code: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSupplierDocumentById(id: string) {
  return await prisma.payment.findUnique({
    where: { id, deletedAt: null },
    include: { supplier: { select: { id: true, code: true, name: true } } },
  });
}

export async function createSupplierDocument(data: SupplierDocumentInput & { number: string }, userId: string) {
  return await prisma.payment.create({
    data: {
      ...data,
      date: data.documentDate,
      createdById: userId,
    },
  });
}

export async function updateSupplierDocument(id: string, data: Partial<SupplierDocumentInput>) {
  const updateData: any = { ...data };
  if (data.documentDate) updateData.date = data.documentDate;
  delete updateData.documentDate;

  return await prisma.payment.update({
    where: { id },
    data: updateData,
  });
}

export async function cancelSupplierDocument(id: string, cancellationReason: string) {
  return await prisma.payment.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancellationReason,
    },
  });
}

export async function generateDocumentNumber() {
  const count = await prisma.payment.count({
    where: { supplierId: { not: null } },
  });
  return `AP-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
}
