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
  const date = new Date().toISOString().slice(0, 10);
  return `reporte-${slug}-${date}.pdf`;
}
