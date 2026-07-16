// tests/supplier-reports/reportFilename.test.ts
import { describe, expect, it } from "vitest";
import { supplierReportFilename } from "@/modules/suppliers-reports/utils/filename";

describe("supplierReportFilename", () => {
  it("formats by-due-date filename", () => {
    expect(supplierReportFilename("by-due-date")).toMatch(
      /^reporte-por-pagar-x-fecha-\d{4}-\d{2}-\d{2}\.pdf$/
    );
  });

  it("formats by-supplier filename", () => {
    expect(supplierReportFilename("by-supplier")).toMatch(
      /^reporte-por-pagar-x-proveedor-\d{4}-\d{2}-\d{2}\.pdf$/
    );
  });

  it("formats daily-summary filename", () => {
    expect(supplierReportFilename("daily-summary")).toMatch(
      /^reporte-resumen-x-dia-\d{4}-\d{2}-\d{2}\.pdf$/
    );
  });
});