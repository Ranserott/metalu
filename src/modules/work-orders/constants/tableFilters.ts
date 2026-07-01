// src/modules/work-orders/constants/tableFilters.ts
import type { ColumnFilterDef } from "@/components/tables/TableToolbar";

export const WORK_ORDER_TABLE_FILTERS: ColumnFilterDef[] = [
  {
    key: "status",
    label: "Estado",
    options: [
      { value: "TODO", label: "Pendiente" },
      { value: "IN_PROGRESS", label: "En Progreso" },
      { value: "QUALITY_CHECK", label: "Control de Calidad" },
      { value: "COMPLETED", label: "Completado" },
    ],
  },
];