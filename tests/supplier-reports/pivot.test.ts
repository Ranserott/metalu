import { describe, expect, it } from "vitest";
import { pivotDailySummary } from "@/modules/suppliers-reports/services/supplierReportService";

describe("pivotDailySummary", () => {
  it("groups by day and pivots by estado", () => {
    const result = pivotDailySummary([
      {
        fechaDocumento: new Date("2026-07-08T10:00:00Z"),
        estado: "PAGADO",
        _count: { _all: 3 },
        _sum: { valor: 100000 },
      },
      {
        fechaDocumento: new Date("2026-07-08T18:30:00Z"),
        estado: "PENDIENTE",
        _count: { _all: 2 },
        _sum: { valor: 50000 },
      },
      {
        fechaDocumento: new Date("2026-07-09T09:00:00Z"),
        estado: "CANCELADO",
        _count: { _all: 1 },
        _sum: { valor: 25000 },
      },
    ]);

    expect(result.rows.length).toBe(2);

    const day1 = result.rows[0];
    expect(day1!.fecha.toISOString().slice(0, 10)).toBe("2026-07-08");
    expect(day1!.pagado.count).toBe(3);
    expect(day1!.pagado.total).toBe(100000);
    expect(day1!.pendiente.count).toBe(2);
    expect(day1!.pendiente.total).toBe(50000);
    expect(day1!.cancelado.count).toBe(0);
    expect(day1!.totalDelDia).toBe(150000);

    const day2 = result.rows[1];
    expect(day2!.fecha.toISOString().slice(0, 10)).toBe("2026-07-09");
    expect(day2!.cancelado.count).toBe(1);
    expect(day2!.totalDelDia).toBe(25000);

    expect(result.totals.count).toBe(6);
    expect(result.totals.total).toBe(175000);
    expect(result.totals.pendiente.total).toBe(50000);
  });

  it("returns empty rows for empty input", () => {
    const result = pivotDailySummary([]);
    expect(result.rows).toEqual([]);
    expect(result.totals.count).toBe(0);
    expect(result.totals.total).toBe(0);
  });

  it("sorts rows by fecha ascending", () => {
    const result = pivotDailySummary([
      {
        fechaDocumento: new Date("2026-07-10T00:00:00Z"),
        estado: "PAGADO",
        _count: { _all: 1 },
        _sum: { valor: 100 },
      },
      {
        fechaDocumento: new Date("2026-07-08T00:00:00Z"),
        estado: "PAGADO",
        _count: { _all: 1 },
        _sum: { valor: 200 },
      },
    ]);
    expect(result.rows[0]!.fecha.toISOString().slice(0, 10)).toBe("2026-07-08");
    expect(result.rows[1]!.fecha.toISOString().slice(0, 10)).toBe("2026-07-10");
  });
});
