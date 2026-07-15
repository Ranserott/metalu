"use client";

import { useMemo, useState } from "react";
import { ColumnDef, FilterFn } from "@tanstack/react-table";
import { Quotation } from "../types/quotation";
import { DataTable } from "@/components/tables/DataTable";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Eye, FileText } from "lucide-react";
import { QUOTATION_SEARCHABLE_KEYS } from "../constants/searchableKeys";
import { QUOTATION_TABLE_FILTERS } from "../constants/tableFilters";

type Props = {
  data: Quotation[];
  onEdit: (quotation: Quotation) => void;
  onView: (quotation: Quotation) => void;
  onDeleteSuccess: () => void;
  /** Per-row predicate for edit/delete affordances. Defaults to always-true. */
  canMutate?: (quotation: Quotation) => boolean;
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SENT: "bg-blue-100 text-blue-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  SENT: "Enviado",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
};

function normalize(s: string | null | undefined): string {
  return (s ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const quotationGlobalFilter: FilterFn<Quotation> = (row, _columnId, filterValue: string) => {
  if (!filterValue) return true;
  const q = normalize(filterValue);
  const haystack = [
    ...QUOTATION_SEARCHABLE_KEYS.map((k) =>
      normalize(row.original[k as keyof Quotation] as unknown as string)
    ),
    normalize(row.original.client?.name),
    normalize(row.original.createdBy?.name),
  ].join(" ");
  return haystack.includes(q);
};

export function QuotationTable({ data, onEdit, onView, onDeleteSuccess, canMutate }: Props) {
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const canMutateRow = canMutate ?? (() => true);
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

  const columns: ColumnDef<Quotation>[] = [
    {
      accessorKey: "number",
      header: "NÚMERO",
    },
    {
      id: "client",
      header: "CLIENTE",
      cell: ({ row }) => row.original.client?.name ?? "—",
    },
    {
      id: "createdBy",
      header: "CREADO POR",
      cell: ({ row }) => row.original.createdBy?.name ?? "—",
    },
    {
      accessorKey: "status",
      header: "ESTADO",
      cell: ({ row }) => (
        <Badge className={statusColors[row.original.status] ?? ""}>
          {statusLabels[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "validUntil",
      header: "VÁLIDO HASTA",
      cell: ({ row }) => new Date(row.original.validUntil).toLocaleDateString("es-CL"),
    },
    {
      accessorKey: "total",
      header: "TOTAL",
      cell: ({ row }) => {
        const total = row.original.total;
        const num = typeof total === 'string' ? parseFloat(total) : total;
        return new Intl.NumberFormat("es-CL", {
          style: "currency",
          currency: "CLP",
        }).format(num);
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const q = row.original;
        const editable = canMutateRow(q);
        return (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="border-gray-400 text-gray-600 hover:bg-gray-50"
              onClick={() => onView(q)}
              title="Ver detalle"
            >
              <Eye className="w-4 h-4" />
            </Button>
            {editable && (
              <Button
                size="sm"
                variant="outline"
                className="border-blue-500 text-blue-500 hover:bg-blue-50"
                onClick={() => onEdit(q)}
                title="Editar"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
            {editable && (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  if (confirm("¿Eliminar esta cotización?")) {
                    setDeleteLoading(q.id);
                    const res = await fetch(`/api/quotations/${q.id}`, { method: "DELETE" });
                    if (res.ok) onDeleteSuccess();
                    setDeleteLoading(null);
                  }
                }}
                disabled={deleteLoading === q.id}
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
        searchPlaceholder="Buscar por número, cliente, notas..."
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        filters={QUOTATION_TABLE_FILTERS}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
      />
      <DataTable
        columns={columns}
        data={data}
        globalFilter={searchValue}
        onGlobalFilterChange={setSearchValue}
        globalFilterFn={quotationGlobalFilter}
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
