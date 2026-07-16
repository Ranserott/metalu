"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyReportState } from "../EmptyReportState";
import {
  SelectionCheckboxHeader,
} from "../SelectionCheckboxHeader";
import { formatCLP, formatDate } from "@/modules/reports/utils/formatters";
import {
  SUPPLIER_DOCUMENT_TYPE_LABELS,
} from "@/modules/suppliers/types/supplierDocument";
import type {
  SupplierDocByDueDateRow,
  SupplierDocByDueDateTotals,
} from "../../types/report";

type Props = {
  rows: SupplierDocByDueDateRow[];
  totals?: SupplierDocByDueDateTotals;
  loading: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
};

function buildColumns(
  selectedIds: Set<string>,
  onToggleSelect: (id: string) => void
): ColumnDef<SupplierDocByDueDateRow>[] {
  return [
    {
      id: "select",
      header: () => (
        <SelectionCheckboxHeader
          visibleIds={[]}
          selectedIds={selectedIds}
          onToggleAll={onToggleAll}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={() => onToggleSelect(row.original.id)}
          aria-label="Seleccionar documento"
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: "fechaVencimiento",
      header: "Fecha Vencimiento",
      cell: ({ row }) => formatDate(row.original.fechaVencimiento),
    },
    {
      accessorKey: "supplierName",
      header: "Proveedor",
      cell: ({ row }) => `${row.original.supplierCode} · ${row.original.supplierName}`,
    },
    {
      accessorKey: "tipoDocumento",
      header: "Tipo",
      cell: ({ row }) =>
        SUPPLIER_DOCUMENT_TYPE_LABELS[row.original.tipoDocumento],
    },
    { accessorKey: "nombre", header: "Nombre" },
    { accessorKey: "documento", header: "N° Documento" },
    {
      accessorKey: "valor",
      header: "Valor",
      cell: ({ row }) => formatCLP(row.original.valor),
    },
  ];
}

export function ByDueDateTab({
  rows,
  totals,
  loading,
  selectedIds,
  onToggleSelect,
  onToggleAll,
}: Props) {
  if (!loading && rows.length === 0) {
    return (
      <EmptyReportState message="No hay documentos pendientes para los filtros seleccionados" />
    );
  }

  // Wire the visible rows back into the header so "select all" sees them.
  const columns = buildColumns(selectedIds, onToggleSelect);
  const headerColumns = columns.map((c, i) =>
    i === 0
      ? {
          ...c,
          header: () => (
            <SelectionCheckboxHeader
              visibleIds={rows.map((r) => r.id)}
              selectedIds={selectedIds}
              onToggleAll={onToggleAll}
            />
          ),
        }
      : c
  );

  return (
    <div className="space-y-3">
      <DataTable columns={headerColumns} data={rows} />
      {totals && rows.length > 0 && (
        <div className="flex justify-end gap-6 rounded-md border bg-gray-50 px-4 py-2 text-sm">
          <div>
            <span className="text-gray-500">Σ Valor: </span>
            <span className="font-semibold">{formatCLP(totals.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
