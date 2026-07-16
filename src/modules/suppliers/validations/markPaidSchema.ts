import { z } from "zod";

export const markPaidSchema = z.object({
  ids: z
    .array(z.string().uuid("Cada id debe ser un UUID válido"))
    .min(1, "Marcá al menos 1 documento")
    .max(500, "Máximo 500 documentos por solicitud"),
});

export type MarkPaidInput = z.infer<typeof markPaidSchema>;
