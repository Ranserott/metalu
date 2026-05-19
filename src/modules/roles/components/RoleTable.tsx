"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Role } from "../types/role";
import { DataTable } from "@/components/tables/DataTable";

export const columns: ColumnDef<Role>[] = [
  {
    accessorKey: "name",
    header: "Nombre",
  },
  {
    accessorKey: "createdAt",
    header: "Creado",
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
];

export function RoleTable({ data }: { data: Role[] }) {
  return <DataTable columns={columns} data={data} />;
}