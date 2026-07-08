import { prisma } from "@/lib/prisma/prisma";
import type {
  SupplierDocByDueDateRow,
  SupplierDocByDueDateTotals,
} from "../types/report";

export type SupplierReportFilters = {
  supplierId?: string;
  from?: Date;
  to?: Date;
};

const toNumber = (v: unknown): number => (v == null ? 0 : Number(v));

function buildWhere(filters: SupplierReportFilters, dateField: "fechaVencimiento" | "fechaDocumento") {
  return {
    deletedAt: null,
    ...(filters.supplierId && { supplierId: filters.supplierId }),
    ...((filters.from || filters.to) && {
      [dateField]: {
        ...(filters.from && { gte: filters.from }),
        ...(filters.to && { lte: filters.to }),
      },
    }),
  };
}

export async function getDocumentsByDueDate(
  filters: SupplierReportFilters
): Promise<{ rows: SupplierDocByDueDateRow[]; totals: SupplierDocByDueDateTotals }> {
  const where = { ...buildWhere(filters, "fechaVencimiento"), estado: "PENDIENTE" as const };

  const docs = await prisma.supplierDocument.findMany({
    where,
    include: { supplier: { select: { code: true, name: true } } },
    orderBy: { fechaVencimiento: "asc" },
  });

  const rows: SupplierDocByDueDateRow[] = docs.map((d) => ({
    id: d.id,
    fechaVencimiento: d.fechaVencimiento,
    supplierCode: d.supplier.code,
    supplierName: d.supplier.name,
    tipoDocumento: d.tipoDocumento,
    nombre: d.nombre,
    documento: d.documento,
    valor: toNumber(d.valor),
  }));

  const total = rows.reduce((acc, r) => acc + r.valor, 0);
  return { rows, totals: { total } };
}