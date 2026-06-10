import { z } from "zod";

export const UserSchema = z.object({
  email: z.string().email("Email inválido"),
  name: z.string().min(1, "Nombre requerido"),
  password: z.string().min(6, "Mínimo 6 caracteres").optional(),
  isActive: z.boolean().default(true),
  roleIds: z.array(z.string()).min(1, "Al menos un rol requerido"),
});

export const ResetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Mínimo 6 caracteres"),
});

export type UserInput = z.infer<typeof UserSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
