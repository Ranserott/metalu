import { z } from "zod";

export const LoginSchema = z.object({
  username: z.string().min(1, "Usuario requerido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// RegisterSchema is dead code — user creation happens through the admin
// /users page. Kept for now in case it's needed later; remove if untouched
// after a quarter.
export const RegisterSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export type RegisterInput = z.infer<typeof RegisterSchema>;