"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Trash2, Loader2 } from "lucide-react";
import { WorkOrder } from "../types/workOrder";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" });

const STATUS_OPTIONS = [
  { value: "TODO", label: "Pendiente" },
  { value: "IN_PROGRESS", label: "En Progreso" },
  { value: "QUALITY_CHECK", label: "Control de Calidad" },
  { value: "COMPLETED", label: "Completado" },
] as const;

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
  onStatusChange?: (wo: WorkOrder, newStatus: string) => Promise<void> | void;
};

export function WorkOrderTable({
  data,
  onView,
  onEdit,
  onDeleteSuccess,
  onStatusChange,
}: Props) {
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);

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
        const wo = row.original;
        const isLoading = statusLoading === wo.id;
        if (!onStatusChange) {
          return (
            <span
              className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                statusColors[wo.status] || ""
              }`}
            >
              {statusLabels[wo.status] || wo.status}
            </span>
          );
        }
        return (
          <div className="flex items-center gap-1">
            <Select
              value={wo.status}
              onValueChange={async (value) => {
                if (value === wo.status) return;
                setStatusLoading(wo.id);
                try {
                  await onStatusChange(wo, value);
                } finally {
                  setStatusLoading(null);
                }
              }}
              disabled={isLoading}
            >
              <SelectTrigger
                className={`h-7 px-2 py-0 text-xs font-semibold rounded border-0 ${
                  statusColors[wo.status] || ""
                } focus:ring-1 focus:ring-[var(--theme-primary)]`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                        statusColors[opt.value] || ""
                      }`}
                    >
                      {opt.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isLoading && <Loader2 className="h-3 w-3 animate-spin text-gray-500" />}
          </div>
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
