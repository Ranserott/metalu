import { z } from "zod";

export const SupplierSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  contact: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  ciudad: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type SupplierInput = z.infer<typeof SupplierSchema>;