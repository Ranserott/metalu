"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Setting } from "../types/setting";
import { DataTable } from "@/components/tables/DataTable";

export const columns: ColumnDef<Setting>[] = [
  {
    accessorKey: "key",
    header: "Clave",
  },
  {
    accessorKey: "value",
    header: "Valor",
  },
  {
    accessorKey: "description",
    header: "Descripcion",
  },
  {
    accessorKey: "updatedAt",
    header: "Actualizado",
    cell: ({ row }) => new Date(row.original.updatedAt).toLocaleDateString(),
  },
];

export function SettingTable({ data }: { data: Setting[] }) {
  return <DataTable columns={columns} data={data} />;
}