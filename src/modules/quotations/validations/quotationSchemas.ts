import { z } from "zod";

export const QuotationSchema = z.object({
  number: z.string().min(1, "Número requerido"),
  clientId: z.string().min(1, "Cliente requerido"),
  status: z.string().default("DRAFT"),
  validUntil: z.string().or(z.date()),
  subtotal: z.string().optional(),
  tax: z.string().optional(),
  total: z.string().optional(),
  discount: z.string().optional(),
  discountType: z.enum(["NONE", "AMOUNT", "PERCENT"]).optional().default("NONE"),
  notes: z.string().optional(),
});

export const QuotationItemSchema = z.object({
  description: z.string().min(1, "Descripción requerida"),
  quantity: z.number().positive("Cantidad debe ser mayor a 0"),
  unitPrice: z.number().positive("Precio debe ser mayor a 0"),
});

export type QuotationInput = z.infer<typeof QuotationSchema>;
export type QuotationItemInput = z.infer<typeof QuotationItemSchema>;
