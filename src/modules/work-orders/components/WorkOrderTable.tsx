"use client";

import { ColumnDef } from "@tanstack/react-table";
import { WorkOrder } from "../types/workOrder";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";

export const columns: ColumnDef<WorkOrder>[] = [
  {
    accessorKey: "number",
    header: "Numero",
  },
  {
    accessorKey: "title",
    header: "Titulo",
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
        TODO: "secondary",
        IN_PROGRESS: "default",
        QUALITY_CHECK: "default",
        COMPLETED: "default",
      };
      return <Badge variant={variants[row.original.status] || "secondary"}>{row.original.status}</Badge>;
    },
  },
  {
    accessorKey: "priority",
    header: "Prioridad",
  },
  {
    accessorKey: "dueDate",
    header: "Fecha Limite",
    cell: ({ row }) => new Date(row.original.dueDate).toLocaleDateString(),
  },
];

export function WorkOrderTable({ data }: { data: WorkOrder[] }) {
  return <DataTable columns={columns} data={data} />;
}