import { z } from "zod";

// Paso 1 — used on POST and on PATCH when status = SOLICITUD_GENERADA
export const SolicitudSchema = z.object({
  workOrderId: z.string().min(1, "Trabajo requerido"),
  clientId: z.string().min(1, "Cliente requerido"),
  fechaTrabajo: z.coerce.date(),
  fechaEntrega: z.coerce.date(),
  diasSinOC: z.number().int().min(0).optional(),
  solicitud1: z.coerce.date().optional().nullable(),
  solicitud2: z.coerce.date().optional().nullable(),
  solicitud3: z.coerce.date().optional().nullable(),
  notasInternas: z.string().optional(),
});

export type SolicitudInput = z.infer<typeof SolicitudSchema>;

// Paso 2 — used on PATCH when status = EN_REVISION
export const SolicitudReviewSchema = z.object({
  supplierId: z.string().min(1, "Proveedor requerido"),
  items: z
    .array(
      z.object({
        description: z.string().min(1, "Descripción requerida"),
        quantity: z.coerce.number().positive("Cantidad debe ser positiva"),
        unitPrice: z.coerce.number().nonnegative("Precio debe ser ≥ 0"),
      })
    )
    .min(1, "Al menos un item requerido"),
  discount: z.coerce.number().nonnegative().optional(),
  discountType: z.enum(["NONE", "AMOUNT", "PERCENT"]).optional(),
});

export type SolicitudReviewInput = z.infer<typeof SolicitudReviewSchema>;

// Transitions endpoint
export const SolicitudTransitionSchema = z.object({
  action: z.enum(["submit", "approve", "reject", "cancel"]),
  reason: z.string().optional(),
});

export type SolicitudTransitionInput = z.infer<typeof SolicitudTransitionSchema>;
