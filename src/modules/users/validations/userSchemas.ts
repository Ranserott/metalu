import { z } from "zod";

export const CreateUserSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(100, "Máximo 100 caracteres"),
  phone: z.string().max(30, "Máximo 30 caracteres").optional().nullable(),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  roles: z.array(z.string()).min(1, "Al menos un rol requerido"),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(100, "Máximo 100 caracteres").optional(),
  phone: z.string().max(30, "Máximo 30 caracteres").optional().nullable(),
  isActive: z.boolean().optional(),
  roles: z.array(z.string()).min(1, "Al menos un rol requerido").optional(),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(6, "Mínimo 6 caracteres"),
  newPassword: z.string().min(6, "Mínimo 6 caracteres"),
});

export const ChangePasswordAdminSchema = z.object({
  newPassword: z.string().min(6, "Mínimo 6 caracteres"),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type ChangePasswordAdminInput = z.infer<typeof ChangePasswordAdminSchema>;