// src/modules/clients/constants/tableFilters.ts
import type { ColumnFilterDef } from "@/components/tables/TableToolbar";

export const CLIENT_TABLE_FILTERS: ColumnFilterDef[] = [
  {
    key: "isActive",
    label: "Estado",
    options: [
      { value: "true", label: "Activo" },
      { value: "false", label: "Inactivo" },
    ],
  },
];
