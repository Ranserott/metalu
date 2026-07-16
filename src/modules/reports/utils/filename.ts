// src/modules/reports/utils/filename.ts
import type { ReportType } from "../types/report";

const TAB_SLUGS: Record<ReportType, string> = {
  cartola: "cartola-clientes",
  "pending-invoices": "facturas-pendientes",
  sales: "ventas",
  payments: "pagos",
  "credit-notes": "notas-credito",
  balances: "saldos",
};

export function reportFilename(type: ReportType): string {
  const slug = TAB_SLUGS[type];
  // Filename date is user-visible; use Santiago local time so a click at 22:00 CLT
  // doesn't produce tomorrow's UTC date. `en-CA` gives ISO-shaped YYYY-MM-DD.
  const date = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Santiago",
  });
  return `reporte-${slug}-${date}.pdf`;
}
