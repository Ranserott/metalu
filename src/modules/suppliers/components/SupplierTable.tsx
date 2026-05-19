"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Supplier } from "../types/supplier";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";

export const columns: ColumnDef<Supplier>[] = [
  {
    accessorKey: "code",
    header: "Codigo",
  },
  {
    accessorKey: "name",
    header: "Nombre",
  },
  {
    accessorKey: "contact",
    header: "Contacto",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "phone",
    header: "Telefono",
  },
  {
    accessorKey: "isActive",
    header: "Estado",
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "default" : "secondary"}>
        {row.original.isActive ? "Activo" : "Inactivo"}
      </Badge>
    ),
  },
];

export function SupplierTable({ data }: { data: Supplier[] }) {
  return <DataTable columns={columns} data={data} />;
}