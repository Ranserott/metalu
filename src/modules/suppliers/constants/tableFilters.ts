// src/modules/suppliers/constants/tableFilters.ts
import type { ColumnFilterDef } from "@/components/tables/TableToolbar";

export const SUPPLIER_TABLE_FILTERS: ColumnFilterDef[] = [
  {
    key: "isActive",
    label: "Estado",
    options: [
      { value: "true", label: "Activo" },
      { value: "false", label: "Inactivo" },
    ],
  },
];
