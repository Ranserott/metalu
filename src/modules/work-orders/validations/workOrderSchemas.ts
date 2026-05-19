import { z } from "zod";

export const WorkOrderSchema = z.object({
  number: z.string().min(1, "Numero requerido"),
  clientId: z.string().min(1, "Cliente requerido"),
  quotationId: z.string().optional(),
  title: z.string().min(1, "Titulo requerido"),
  description: z.string().optional(),
  status: z.string().default("TODO"),
  priority: z.string().default("MEDIUM"),
  dueDate: z.date(),
});

export type WorkOrderInput = z.infer<typeof WorkOrderSchema>;