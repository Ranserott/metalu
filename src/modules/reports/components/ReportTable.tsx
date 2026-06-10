"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Report } from "../types/report";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";

export const columns: ColumnDef<Report>[] = [
  {
    accessorKey: "name",
    header: "Nombre",
  },
  {
    accessorKey: "type",
    header: "Tipo",
  },
  {
    accessorKey: "description",
    header: "Descripcion",
  },
  {
    accessorKey: "createdAt",
    header: "Creado",
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString("es-CL"),
  },
];

export function ReportTable({ data }: { data: Report[] }) {
  return <DataTable columns={columns} data={data} />;
}