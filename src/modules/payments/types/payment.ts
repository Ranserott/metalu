export type SupplierDocument = {
  id: string;
  number: string;
  supplierId: string;
  supplierName?: string;
  supplierCode?: string;
  documentType: "FA" | "BO" | "PA" | "OT" | "CH";
  documentNumber: string;
  documentDate: Date;
  dueDate: Date | null;
  amount: number;
  status: "PENDIENTE" | "PAGADO" | "CANCELLED";
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};