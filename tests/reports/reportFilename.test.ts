// tests/reports/reportFilename.test.ts
import { describe, expect, it } from "vitest";
import { reportFilename } from "@/modules/reports/utils/filename";

describe("reportFilename", () => {
  it("formats cartola filename", () => {
    const name = reportFilename("cartola");
    expect(name).toMatch(/^reporte-cartola-clientes-\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it("formats pending-invoices filename", () => {
    expect(reportFilename("pending-invoices")).toMatch(
      /^reporte-facturas-pendientes-\d{4}-\d{2}-\d{2}\.pdf$/
    );
  });

  it("formats sales filename", () => {
    expect(reportFilename("sales")).toMatch(/^reporte-ventas-\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it("formats payments filename", () => {
    expect(reportFilename("payments")).toMatch(/^reporte-pagos-\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it("formats credit-notes filename", () => {
    expect(reportFilename("credit-notes")).toMatch(
      /^reporte-notas-credito-\d{4}-\d{2}-\d{2}\.pdf$/
    );
  });

  it("formats balances filename", () => {
    expect(reportFilename("balances")).toMatch(/^reporte-saldos-\d{4}-\d{2}-\d{2}\.pdf$/);
  });
});
