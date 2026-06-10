"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Purchase } from "../types/purchase";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";

export const columns: ColumnDef<Purchase>[] = [
  {
    accessorKey: "number",
    header: "Numero",
  },
  {
    accessorKey: "supplierId",
    header: "Proveedor",
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const variants: Record<string, any> = {
        DRAFT: "secondary",
        SENT: "default",
        PARTIAL: "default",
        RECEIVED: "default",
        CANCELLED: "destructive",
      };
      return <Badge variant={variants[row.original.status] || "secondary"}>{row.original.status}</Badge>;
    },
  },
  {
    accessorKey: "total",
    header: "Total",
  },
  {
    accessorKey: "createdAt",
    header: "Fecha",
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString("es-CL"),
  },
];

export function PurchaseTable({ data }: { data: Purchase[] }) {
  return <DataTable columns={columns} data={data} />;
}