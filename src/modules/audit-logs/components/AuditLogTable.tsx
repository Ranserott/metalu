"use client";

import { ColumnDef } from "@tanstack/react-table";
import { AuditLog } from "../types/auditLog";
import { DataTable } from "@/components/tables/DataTable";

export const columns: ColumnDef<AuditLog>[] = [
  {
    accessorKey: "userId",
    header: "Usuario",
  },
  {
    accessorKey: "action",
    header: "Accion",
  },
  {
    accessorKey: "resource",
    header: "Recurso",
  },
  {
    accessorKey: "resourceId",
    header: "ID Recurso",
  },
  {
    accessorKey: "createdAt",
    header: "Fecha",
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
  },
];

export function AuditLogTable({ data }: { data: AuditLog[] }) {
  return <DataTable columns={columns} data={data} />;
}