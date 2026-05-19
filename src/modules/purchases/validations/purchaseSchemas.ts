import { z } from "zod";

export const PurchaseSchema = z.object({
  number: z.string().min(1, "Numero requerido"),
  supplierId: z.string().min(1, "Proveedor requerido"),
  status: z.string().default("DRAFT"),
  subtotal: z.string().optional(),
  tax: z.string().optional(),
  total: z.string().optional(),
});

export type PurchaseInput = z.infer<typeof PurchaseSchema>;