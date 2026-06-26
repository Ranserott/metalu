"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { WorkOrder } from "../types/workOrder";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";

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

type Props = {
  data: WorkOrder[];
  onView?: (wo: WorkOrder) => void;
  onEdit?: (wo: WorkOrder) => void;
  onDeleteSuccess?: () => void;
};

export function WorkOrderTable({ data, onView, onEdit, onDeleteSuccess }: Props) {
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const columns: ColumnDef<WorkOrder>[] = [
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
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex gap-1">
          {onView && (
            <Button
              size="sm"
              variant="outline"
              className="border-gray-400 text-gray-600 hover:bg-gray-50"
              onClick={() => onView(row.original)}
              title="Ver detalle"
            >
              <Eye className="w-4 h-4" />
            </Button>
          )}
          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              className="border-blue-500 text-blue-500 hover:bg-blue-50"
              onClick={() => onEdit(row.original)}
              title="Editar"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          {onDeleteSuccess && (
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                if (confirm("¿Eliminar este trabajo?")) {
                  setDeleteLoading(row.original.id);
                  const res = await fetch(`/api/work-orders/${row.original.id}`, {
                    method: "DELETE",
                  });
                  if (res.ok) onDeleteSuccess();
                  setDeleteLoading(null);
                }
              }}
              disabled={deleteLoading === row.original.id}
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return <DataTable columns={columns} data={data} />;
}
