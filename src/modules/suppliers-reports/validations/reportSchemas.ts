import { z } from "zod";

export const supplierReportTypeSchema = z.enum([
  "by-due-date",
  "by-supplier",
  "daily-summary",
]);

export const supplierReportFiltersSchema = z.object({
  type: supplierReportTypeSchema,
  supplierId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
