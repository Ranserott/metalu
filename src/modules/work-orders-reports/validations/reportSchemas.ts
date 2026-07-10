import { z } from "zod";

export const workOrderReportTypeSchema = z.enum(["by-client", "by-workorder"]);

export const workOrderReportFiltersSchema = z.object({
  type: workOrderReportTypeSchema,
  clientId: z.string().uuid().optional(),
  local: z.string().optional(),
  encargadoId: z.string().uuid().optional(),
  facturado: z.enum(["all", "yes", "no"]).optional(),
  nroFactura: z.string().optional(),
  nroGuia: z.string().optional(),
  nroOrdenCompra: z.string().optional(),
  status: z.string().optional(),
  description: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  number: z.string().optional(),
});