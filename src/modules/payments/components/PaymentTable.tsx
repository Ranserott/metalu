"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Payment } from "../types/payment";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";

export const columns: ColumnDef<Payment>[] = [
  {
    accessorKey: "number",
    header: "Numero",
  },
  {
    accessorKey: "invoiceId",
    header: "Factura",
  },
  {
    accessorKey: "amount",
    header: "Monto",
  },
  {
    accessorKey: "method",
    header: "Metodo",
  },
  {
    accessorKey: "date",
    header: "Fecha",
    cell: ({ row }) => new Date(row.original.date).toLocaleDateString(),
  },
];

export function PaymentTable({ data }: { data: Payment[] }) {
  return <DataTable columns={columns} data={data} />;
}