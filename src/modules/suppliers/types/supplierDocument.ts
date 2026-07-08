import { SupplierDocumentType } from "@/generated/prisma/client";

export type SupplierDocument = {
  id: string;
  supplierId: string;
  nombre: string;
  tipoDocumento: SupplierDocumentType;
  documento: string;
  fechaDocumento: Date;
  valor: number;
  fechaVencimiento: Date;
  estado: string;
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