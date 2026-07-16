import { prisma } from "@/lib/prisma/prisma";
import { SupplierDocumentInput } from "../validations/supplierDocumentSchemas";

export async function getDocumentsBySupplier(supplierId: string) {
  return await prisma.supplierDocument.findMany({
    where: { supplierId, deletedAt: null },
    orderBy: { fechaDocumento: "desc" },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });
}

export async function createDocument(
  supplierId: string,
  data: SupplierDocumentInput,
  userId?: string | null
) {
  return await prisma.supplierDocument.create({
    data: {
      supplierId,
      nombre: data.nombre,
      tipoDocumento: data.tipoDocumento,
      documento: data.documento,
      fechaDocumento: data.fechaDocumento,
      valor: data.valor,
      fechaVencimiento: data.fechaVencimiento,
      estado: data.estado,
      createdById: userId && !userId.startsWith("temp-") ? userId : null,
    },
  });
}

export async function deleteDocument(docId: string) {
  return await prisma.supplierDocument.update({
    where: { id: docId },
    data: { deletedAt: new Date() },
  });
}

export async function markDocumentsAsPaid(
  ids: string[]
): Promise<{ updated: number }> {
  if (ids.length === 0) return { updated: 0 };
  // Idempotent: the `estado: "PENDIENTE"` filter excludes rows that are already
  // PAGADO, so re-calling with the same ids returns { updated: 0 } (not an error).
  const result = await prisma.supplierDocument.updateMany({
    where: { id: { in: ids }, estado: "PENDIENTE" },
    data: { estado: "PAGADO" },
  });
  return { updated: result.count };
}