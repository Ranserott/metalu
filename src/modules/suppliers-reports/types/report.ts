import type { SupplierDocumentStatus, SupplierDocumentType } from "@/generated/prisma/client";

export type SupplierReportType = "by-due-date" | "by-supplier" | "daily-summary";

export type SupplierDocByDueDateRow = {
  id: string;
  fechaVencimiento: Date;
  supplierCode: string;
  supplierName: string;
  tipoDocumento: SupplierDocumentType;
  nombre: string;
  documento: string;
  valor: number;
};

export type SupplierDocByDueDateTotals = { total: number };

export type SupplierDocBySupplierRow = SupplierDocByDueDateRow & { supplierId: string };

export type SupplierDocBySupplierTotals = { total: number; count: number };

export type EstadoBreakdown = { count: number; total: number };

export type DailySummaryRow = {
  fecha: Date;
  pendiente: EstadoBreakdown;
  pagado: EstadoBreakdown;
  cancelado: EstadoBreakdown;
  totalDelDia: number;
};

export type DailySummaryTotals = {
  pendiente: EstadoBreakdown;
  pagado: EstadoBreakdown;
  cancelado: EstadoBreakdown;
  count: number;
  total: number;
};

export type SupplierOption = { id: string; name: string };
