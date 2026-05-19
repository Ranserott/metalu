import { z } from "zod";

export const SettingSchema = z.object({
  key: z.string().min(1, "Clave requerida"),
  value: z.string().min(1, "Valor requerido"),
  description: z.string().optional(),
});

export type SettingInput = z.infer<typeof SettingSchema>;