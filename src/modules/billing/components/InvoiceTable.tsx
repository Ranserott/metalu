"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Invoice } from "../types/invoice";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";

export const columns: ColumnDef<Invoice>[] = [
  {
    accessorKey: "number",
    header: "Numero",
  },
  {
    accessorKey: "clientId",
    header: "Cliente",
  },
  {
    accessorKey: "type",
    header: "Tipo",
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const variants: Record<string, any> = {
        DRAFT: "secondary",
        ISSUED: "default",
        PAID: "default",
        OVERDUE: "destructive",
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
    accessorKey: "dueDate",
    header: "Vencimiento",
    cell: ({ row }) => new Date(row.original.dueDate).toLocaleDateString("es-CL"),
  },
];

export function InvoiceTable({ data }: { data: Invoice[] }) {
  return <DataTable columns={columns} data={data} />;
}