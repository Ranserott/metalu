import { z } from "zod";

export const EncargadoSchema = z.object({
  rut: z.string().min(1, "RUT requerido"),
  name: z.string().min(1, "Nombre requerido"),
  email: z
    .string()
    .email("Email inválido")
    .optional()
    .or(z.literal("")),
  phone: z.string().optional(),
  position: z.string().optional(),
  clientId: z.string().min(1, "Cliente requerido"),
});

export type EncargadoInputValidated = z.infer<typeof EncargadoSchema>;
