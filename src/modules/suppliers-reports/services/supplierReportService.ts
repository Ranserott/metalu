import { prisma } from "@/lib/prisma/prisma";
import type {
  SupplierDocByDueDateRow,
  SupplierDocByDueDateTotals,
  SupplierDocBySupplierRow,
  SupplierDocBySupplierTotals,
  DailySummaryRow,
  DailySummaryTotals,
} from "../types/report";
import { pivotDailySummary } from "./pivot";

// Re-export the pure pivot helper so existing imports from this module keep working
export { pivotDailySummary };
export type { GroupedRow } from "./pivot";

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

export async function getDocumentsBySupplier(
  filters: SupplierReportFilters
): Promise<{ rows: SupplierDocBySupplierRow[]; totals: SupplierDocBySupplierTotals }> {
  const where = { ...buildWhere(filters, "fechaVencimiento"), estado: "PENDIENTE" as const };

  const docs = await prisma.supplierDocument.findMany({
    where,
    include: { supplier: { select: { id: true, code: true, name: true } } },
    orderBy: [{ supplier: { name: "asc" } }, { fechaVencimiento: "asc" }],
  });

  const rows: SupplierDocBySupplierRow[] = docs.map((d) => ({
    id: d.id,
    supplierId: d.supplierId,
    fechaVencimiento: d.fechaVencimiento,
    supplierCode: d.supplier.code,
    supplierName: d.supplier.name,
    tipoDocumento: d.tipoDocumento,
    nombre: d.nombre,
    documento: d.documento,
    valor: toNumber(d.valor),
  }));

  const total = rows.reduce((acc, r) => acc + r.valor, 0);
  return { rows, totals: { total, count: rows.length } };
}

export async function getDailySummary(
  filters: SupplierReportFilters
): Promise<{ rows: DailySummaryRow[]; totals: DailySummaryTotals }> {
  const where = buildWhere(filters, "fechaDocumento");

  const grouped = await prisma.supplierDocument.groupBy({
    by: ["fechaDocumento", "estado"],
    where,
    _count: { _all: true },
    _sum: { valor: true },
  });

  return pivotDailySummary(
    grouped.map((g) => ({
      fechaDocumento: g.fechaDocumento,
      estado: g.estado,
      _count: g._count,
      _sum: g._sum,
    }))
  );
}
