import { z } from "zod";

export const WorkOrderItemSchema = z.object({
  material: z.string().min(1, "Material requerido"),
  quantity: z.number().positive("Cantidad debe ser mayor a 0"),
  unit: z.string().default("UN"),
  unitPrice: z.number().nonnegative().optional(),
  total: z.number().nonnegative().optional(),
});

export const WorkOrderSchema = z.object({
  number: z.string().min(1, "Número requerido"),
  clientId: z.string().min(1, "Cliente requerido"),
  quotationId: z.string().optional().nullable(),
  title: z.string().min(1, "Título requerido"),
  description: z.string().optional().nullable(),
  status: z.string().default("TODO"),
  priority: z.string().default("MEDIUM"),
  dueDate: z.union([z.string(), z.date()]),

  rut: z.string().optional().nullable(),
  razonSocial: z.string().optional().nullable(),
  entregadoPor: z.string().optional().nullable(),
  celular: z.string().optional().nullable(),

  fechaTrabajo: z.union([z.string(), z.date()]).optional().nullable(),
  local: z.string().optional().nullable(),
  encargado: z.string().optional().nullable(),
  condicionesPago: z.string().optional().nullable(),

  nroFactura: z.string().optional().nullable(),
  nroGuia: z.string().optional().nullable(),
  tipoOC: z.string().optional().nullable(),
  nroOrdenCompra: z.string().optional().nullable(),
  fechaEntrega: z.union([z.string(), z.date()]).optional().nullable(),
  plazoDias: z.coerce.number().int().optional().nullable(),

  neto: z.coerce.number().optional().nullable(),
  descuentoPorcentaje: z.coerce.number().min(0).max(100).optional().nullable(),
  subtotalAfecto: z.coerce.number().optional().nullable(),
  iva: z.coerce.number().optional().nullable(),
  total: z.coerce.number().optional().nullable(),
});

export type WorkOrderInput = z.infer<typeof WorkOrderSchema>;
export type WorkOrderItemInput = z.infer<typeof WorkOrderItemSchema>;
