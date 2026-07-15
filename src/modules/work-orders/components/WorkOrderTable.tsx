"use client";

import { useMemo, useState } from "react";
import { ColumnDef, FilterFn } from "@tanstack/react-table";
import { Eye, Pencil, Trash2, Loader2 } from "lucide-react";
import { WorkOrder } from "../types/workOrder";
import { DataTable } from "@/components/tables/DataTable";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WORK_ORDER_SEARCHABLE_KEYS } from "../constants/searchableKeys";
import { WORK_ORDER_TABLE_FILTERS } from "../constants/tableFilters";

const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" });

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Borrador" },
  { value: "TODO", label: "Pendiente" },
  { value: "IN_PROGRESS", label: "En Progreso" },
  { value: "COMPLETED", label: "Completado" },
] as const;

const statusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  TODO: "Pendiente",
  IN_PROGRESS: "En Progreso",
  COMPLETED: "Completado",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-200 text-slate-700",
  TODO: "bg-gray-100 text-gray-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
};

function normalize(s: string | null | undefined): string {
  return (s ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const workOrderGlobalFilter: FilterFn<WorkOrder> = (row, _columnId, filterValue: string) => {
  if (!filterValue) return true;
  const q = normalize(filterValue);
  const haystack = [
    ...WORK_ORDER_SEARCHABLE_KEYS.map((k) =>
      normalize(row.original[k as keyof WorkOrder] as unknown as string)
    ),
    normalize(row.original.client?.name),
  ].join(" ");
  return haystack.includes(q);
};

type Props = {
  data: WorkOrder[];
  onView?: (wo: WorkOrder) => void;
  onEdit?: (wo: WorkOrder) => void;
  onDeleteSuccess?: () => void;
  onStatusChange?: (wo: WorkOrder, newStatus: string) => Promise<void> | void;
  /** Per-row predicate for edit/delete affordances. Defaults to always-true. */
  canMutate?: (wo: WorkOrder) => boolean;
  /** Per-row predicate for the inline status Select. Defaults to always-true. */
  canChangeStatus?: (wo: WorkOrder) => boolean;
};

export function WorkOrderTable({
  data,
  onView,
  onEdit,
  onDeleteSuccess,
  onStatusChange,
  canMutate,
  canChangeStatus,
}: Props) {
  const canMutateRow = canMutate ?? (() => true);
  const canChangeRow = canChangeStatus ?? (() => true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string | undefined>>({});

  const columnFilters = useMemo(
    () =>
      Object.entries(filterValues)
        .filter(([, v]) => v !== undefined)
        .map(([id, value]) => ({ id, value })),
    [filterValues]
  );

  const handleFilterChange = (key: string, value: string | undefined) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const dynamicFilters = useMemo(() => {
    const clienteOptions = Array.from(
      new Set(
        data
          .map((wo) => wo.client?.name)
          .filter((name): name is string => Boolean(name))
      )
    )
      .sort()
      .map((name) => ({ value: name, label: name }));
    return [
      ...WORK_ORDER_TABLE_FILTERS,
      {
        key: "client", // matches the existing column accessorKey
        label: "Cliente",
        options: clienteOptions,
      },
    ];
  }, [data]);

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
      filterFn: (row, _columnId, filterValue: string) => {
        return row.original.client?.name === filterValue;
      },
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
        if (!onStatusChange || !canChangeRow(wo)) {
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
                <SelectValue>
                  {(value: string) => statusLabels[value] ?? value}
                </SelectValue>
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
      cell: ({ row }) => {
        const wo = row.original;
        const editable = canMutateRow(wo);
        return (
          <div className="flex gap-1">
            {onView && (
              <Button
                size="sm"
                variant="outline"
                className="border-gray-400 text-gray-600 hover:bg-gray-50"
                onClick={() => onView(wo)}
                title="Ver detalle"
              >
                <Eye className="w-4 h-4" />
              </Button>
            )}
            {onEdit && editable && (
              <Button
                size="sm"
                variant="outline"
                className="border-blue-500 text-blue-500 hover:bg-blue-50"
                onClick={() => onEdit(wo)}
                title="Editar"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
            {onDeleteSuccess && editable && (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  if (confirm("¿Eliminar este trabajo?")) {
                    setDeleteLoading(wo.id);
                    const res = await fetch(`/api/work-orders/${wo.id}`, {
                      method: "DELETE",
                    });
                    if (res.ok) onDeleteSuccess();
                    setDeleteLoading(null);
                  }
                }}
                disabled={deleteLoading === wo.id}
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <TableToolbar
        searchPlaceholder="Buscar por N°, título, RUT, cliente..."
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        filters={dynamicFilters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
      />
      <DataTable
        columns={columns}
        data={data}
        globalFilter={searchValue}
        onGlobalFilterChange={setSearchValue}
        globalFilterFn={workOrderGlobalFilter}
        columnFilters={columnFilters}
        onColumnFiltersChange={(updater) => {
          const next = typeof updater === "function" ? updater(columnFilters) : updater;
          const map: Record<string, string | undefined> = {};
          for (const f of next) {
            map[f.id] = f.value as string | undefined;
          }
          setFilterValues(map);
        }}
      />
    </>
  );
}
