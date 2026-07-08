import { SupplierDocumentType, SupplierDocumentStatus } from "@/generated/prisma/client";

export type SupplierDocument = {
  id: string;
  supplierId: string;
  nombre: string;
  tipoDocumento: SupplierDocumentType;
  documento: string;
  fechaDocumento: Date;
  valor: number;
  fechaVencimiento: Date;
  estado: SupplierDocumentStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: { id: string; name: string | null } | null;
};

export const SUPPLIER_DOCUMENT_TYPE_LABELS: Record<SupplierDocumentType, string> = {
  FACTURA: "Factura",
  BOLETA: "Boleta",
  PAGARE: "Pagaré",
  OTROS: "Otros",
  CHEQUE: "Cheque",
};

export const SUPPLIER_DOCUMENT_TYPE_OPTIONS: SupplierDocumentType[] = [
  "FACTURA",
  "BOLETA",
  "PAGARE",
  "OTROS",
  "CHEQUE",
];

export const SUPPLIER_DOCUMENT_STATUS_LABELS: Record<SupplierDocumentStatus, string> = {
  PAGADO: "Pagado",
  PENDIENTE: "Pendiente",
  CANCELADO: "Cancelado",
};

export const SUPPLIER_DOCUMENT_STATUS_OPTIONS: SupplierDocumentStatus[] = [
  "PENDIENTE",
  "PAGADO",
  "CANCELADO",
];

export const SUPPLIER_DOCUMENT_STATUS_COLORS: Record<SupplierDocumentStatus, string> = {
  PAGADO: "bg-green-100 text-green-800",
  PENDIENTE: "bg-yellow-100 text-yellow-800",
  CANCELADO: "bg-gray-100 text-gray-800",
};