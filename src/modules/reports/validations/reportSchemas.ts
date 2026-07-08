import { z } from "zod";

export const ReportTypeSchema = z.enum([
  "cartola",
  "pending-invoices",
  "sales",
  "payments",
  "credit-notes",
  "balances",
]);

export const ReportFiltersSchema = z.object({
  type: ReportTypeSchema,
  clientId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type ReportFiltersInput = z.infer<typeof ReportFiltersSchema>;