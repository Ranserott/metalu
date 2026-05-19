import { z } from "zod";

export const ReportSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  type: z.string().min(1, "Tipo requerido"),
  description: z.string().optional(),
});

export type ReportInput = z.infer<typeof ReportSchema>;