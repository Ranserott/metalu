import { z } from "zod";

export const DOCUMENT_TYPES = ["FA", "BO", "PA", "OT", "CH"] as const;
export const PAYMENT_STATUSES = ["PENDIENTE", "PAGADO", "CANCELLED"] as const;

export const SupplierDocumentSchema = z.object({
  supplierId: z.string().min(1, "Proveedor requerido"),
  documentType: z.enum(DOCUMENT_TYPES, { required_error: "Tipo de documento requerido" }),
  documentNumber: z.string().min(1, "N° de documento requerido"),
  documentDate: z.date({ required_error: "Fecha de documento requerida" }),
  dueDate: z.date().optional().nullable(),
  amount: z.number().positive("El valor debe ser mayor a 0"),
  status: z.enum(PAYMENT_STATUSES).default("PENDIENTE"),
  cancellationReason: z.string().optional(),
});

export const CancelDocumentSchema = z.object({
  cancellationReason: z.string().min(1, "Motivo de cancelación requerido"),
});

export type SupplierDocumentInput = z.infer<typeof SupplierDocumentSchema>;
export type CancelDocumentInput = z.infer<typeof CancelDocumentSchema>;