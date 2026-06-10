"use client";

import { ColumnDef } from "@tanstack/react-table";
import { WorkOrder } from "../types/workOrder";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";

const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" });

const statusLabels: Record<string, string> = {
  TODO: "Pendiente",
  IN_PROGRESS: "En Progreso",
  QUALITY_CHECK: "Control de Calidad",
  COMPLETED: "Completado",
};

const statusColors: Record<string, string> = {
  TODO: "bg-gray-100 text-gray-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  QUALITY_CHECK: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
};

export const columns: ColumnDef<WorkOrder>[] = [
  {
    accessorKey: "number",
    header: "N° Trabajo",
    cell: ({ row }) => <span className="font-semibold text-[var(--theme-dark)]">{row.original.number}</span>,
  },
  {
    accessorKey: "client",
    header: "Cliente",
    cell: ({ row }) => row.original.client?.name || row.original.razonSocial || "—",
  },
  {
    accessorKey: "title",
    header: "Título",
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${statusColors[status] || ""}`}>
          {statusLabels[status] || status}
        </span>
      );
    },
  },
  {
    accessorKey: "fechaTrabajo",
    header: "Fecha Trabajo",
    cell: ({ row }) =>
      row.original.fechaTrabajo
        ? new Date(row.original.fechaTrabajo).toLocaleDateString("es-CL")
        : "—",
  },
  {
    accessorKey: "fechaEntrega",
    header: "Entrega",
    cell: ({ row }) =>
      row.original.fechaEntrega
        ? new Date(row.original.fechaEntrega).toLocaleDateString("es-CL")
        : "—",
  },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => (row.original.total ? clp.format(Number(row.original.total)) : "—"),
  },
];

export function WorkOrderTable({ data, onRowClick }: { data: WorkOrder[]; onRowClick?: (wo: WorkOrder) => void }) {
  return <DataTable columns={columns} data={data} onRowClick={onRowClick} />;
}
