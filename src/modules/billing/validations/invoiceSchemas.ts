import { z } from "zod";

export const InvoiceItemSchema = z.object({
  description: z.string().min(1, "Descripcion requerida"),
  quantity: z.coerce.number().nonnegative(),
  unitPrice: z.coerce.number().nonnegative(),
  total: z.coerce.number().nonnegative(),
});

export const InvoiceSchema = z.object({
  number: z.string().optional(),
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
  tipoDocumento: z.string().optional().default("Factura Electrónica"),
  abonos: z.coerce.number().optional(),
  saldo: z.coerce.number().optional(),
  guiasAsociadas: z.string().optional(),
  items: z.array(InvoiceItemSchema).optional(),
});

export type InvoiceInput = z.infer<typeof InvoiceSchema>;
export type InvoiceItemInput = z.infer<typeof InvoiceItemSchema>;