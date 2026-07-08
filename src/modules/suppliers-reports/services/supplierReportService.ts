import { prisma } from "@/lib/prisma/prisma";
import type { SupplierDocumentStatus } from "@/generated/prisma/client";
import type {
  SupplierDocByDueDateRow,
  SupplierDocByDueDateTotals,
  SupplierDocBySupplierRow,
  SupplierDocBySupplierTotals,
  DailySummaryRow,
  DailySummaryTotals,
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

// Pivot helper — pure function, easy to unit test
type GroupedRow = {
  fechaDocumento: Date;
  estado: SupplierDocumentStatus;
  _count: { _all: number };
  // Prisma returns Decimal for `_sum`; toNumber() coerces at use site.
  _sum: { valor: unknown };
};

export function pivotDailySummary(
  grouped: GroupedRow[]
): { rows: DailySummaryRow[]; totals: DailySummaryTotals } {
  // key = YYYY-MM-DD (truncate time)
  const byDay = new Map<string, DailySummaryRow>();

  const emptyBreakdown = (): { count: number; total: number } => ({ count: 0, total: 0 });

  for (const g of grouped) {
    const key = g.fechaDocumento.toISOString().slice(0, 10);
    let row = byDay.get(key);
    if (!row) {
      row = {
        fecha: new Date(`${key}T00:00:00.000Z`),
        pendiente: emptyBreakdown(),
        pagado: emptyBreakdown(),
        cancelado: emptyBreakdown(),
        totalDelDia: 0,
      };
      byDay.set(key, row);
    }
    const count = g._count._all;
    const total = toNumber(g._sum.valor);
    const bucket = row[g.estado.toLowerCase() as "pendiente" | "pagado" | "cancelado"];
    if (bucket) {
      bucket.count += count;
      bucket.total += total;
    }
    row.totalDelDia += total;
  }

  const rows = Array.from(byDay.values()).sort(
    (a, b) => a.fecha.getTime() - b.fecha.getTime()
  );

  const totals: DailySummaryTotals = {
    pendiente: emptyBreakdown(),
    pagado: emptyBreakdown(),
    cancelado: emptyBreakdown(),
    count: 0,
    total: 0,
  };
  for (const r of rows) {
    totals.pendiente.count += r.pendiente.count;
    totals.pendiente.total += r.pendiente.total;
    totals.pagado.count += r.pagado.count;
    totals.pagado.total += r.pagado.total;
    totals.cancelado.count += r.cancelado.count;
    totals.cancelado.total += r.cancelado.total;
    totals.count += r.pendiente.count + r.pagado.count + r.cancelado.count;
    totals.total += r.totalDelDia;
  }

  return { rows, totals };
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