// src/modules/suppliers-reports/utils/filename.ts
import type { SupplierReportType } from "../types/report";

const SLUGS: Record<SupplierReportType, string> = {
  "by-due-date": "por-pagar-x-fecha",
  "by-supplier": "por-pagar-x-proveedor",
  "daily-summary": "resumen-x-dia",
};

export function supplierReportFilename(type: SupplierReportType): string {
  const slug = SLUGS[type];
  // Filename date is user-visible; use Santiago local time so a click at 22:00 CLT
  // doesn't produce tomorrow's UTC date. `en-CA` gives ISO-shaped YYYY-MM-DD.
  const date = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Santiago",
  });
  return `reporte-${slug}-${date}.pdf`;
}