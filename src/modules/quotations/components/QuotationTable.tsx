"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Quotation } from "../types/quotation";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";

export const columns: ColumnDef<Quotation>[] = [
  {
    accessorKey: "number",
    header: "Numero",
  },
  {
    accessorKey: "clientId",
    header: "Cliente",
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const variants: Record<string, any> = {
        DRAFT: "secondary",
        SENT: "default",
        APPROVED: "default",
        REJECTED: "destructive",
      };
      return <Badge variant={variants[row.original.status] || "secondary"}>{row.original.status}</Badge>;
    },
  },
  {
    accessorKey: "validUntil",
    header: "Valido Hasta",
    cell: ({ row }) => new Date(row.original.validUntil).toLocaleDateString(),
  },
  {
    accessorKey: "total",
    header: "Total",
  },
];

export function QuotationTable({ data }: { data: Quotation[] }) {
  return <DataTable columns={columns} data={data} />;
}