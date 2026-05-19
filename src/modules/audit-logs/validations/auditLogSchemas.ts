import { z } from "zod";

export const AuditLogSchema = z.object({
  userId: z.string().min(1, "Usuario requerido"),
  action: z.string().min(1, "Accion requerida"),
  resource: z.string().min(1, "Recurso requerido"),
  resourceId: z.string().min(1, "ID de recurso requerido"),
});

export type AuditLogInput = z.infer<typeof AuditLogSchema>;