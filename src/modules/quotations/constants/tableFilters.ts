// src/modules/quotations/constants/tableFilters.ts
import type { ColumnFilterDef } from "@/components/tables/TableToolbar";

export const QUOTATION_TABLE_FILTERS: ColumnFilterDef[] = [
  {
    key: "status",
    label: "Estado",
    options: [
      { value: "DRAFT", label: "Borrador" },
      { value: "SENT", label: "Enviado" },
      { value: "APPROVED", label: "Aprobado" },
      { value: "REJECTED", label: "Rechazado" },
    ],
  },
];
