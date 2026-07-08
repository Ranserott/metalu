import type { SupplierDocumentStatus } from "@/generated/prisma/client";
import type { DailySummaryRow, DailySummaryTotals } from "../types/report";

export type { DailySummaryRow, DailySummaryTotals };

const toNumber = (v: unknown): number => (v == null ? 0 : Number(v));

export type GroupedRow = {
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
        // Noon UTC keeps the displayed date correct in any local timezone
        // west of UTC-12 (e.g. Chile UTC-4 would otherwise shift to the prior day).
        fecha: new Date(`${key}T12:00:00.000Z`),
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
