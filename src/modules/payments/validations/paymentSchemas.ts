import { z } from "zod";

export const PaymentSchema = z.object({
  number: z.string().min(1, "Numero requerido"),
  invoiceId: z.string().min(1, "Factura requerida"),
  amount: z.string().min(1, "Monto requerido"),
  method: z.string().default("CASH"),
  reference: z.string().optional(),
  date: z.date(),
  notes: z.string().optional(),
});

export type PaymentInput = z.infer<typeof PaymentSchema>;