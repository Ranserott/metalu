import { z } from "zod";

export const QuotationSchema = z.object({
  number: z.string().min(1, "Numero requerido"),
  clientId: z.string().min(1, "Cliente requerido"),
  status: z.string().default("DRAFT"),
  validUntil: z.date(),
  subtotal: z.string().optional(),
  tax: z.string().optional(),
  total: z.string().optional(),
  notes: z.string().optional(),
});

export type QuotationInput = z.infer<typeof QuotationSchema>;