import { z } from "zod";

export const RoleSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
});

export type RoleInput = z.infer<typeof RoleSchema>;