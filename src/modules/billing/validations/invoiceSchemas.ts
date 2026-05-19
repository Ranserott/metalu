import { z } from "zod";

export const InvoiceSchema = z.object({
  number: z.string().min(1, "Numero requerido"),
  clientId: z.string().min(1, "Cliente requerido"),
  workOrderId: z.string().optional(),
  type: z.string().default("INVOICE"),
  status: z.string().default("DRAFT"),
  series: z.string().min(1, "Serie requerida"),
  numberInSeries: z.number().default(1),
  issueDate: z.date(),
  dueDate: z.date(),
  subtotal: z.string().optional(),
  tax: z.string().optional(),
  total: z.string().optional(),
});

export type InvoiceInput = z.infer<typeof InvoiceSchema>;