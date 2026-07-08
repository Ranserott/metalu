"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { EmptyReportState } from "../EmptyReportState";
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
};

const columns: ColumnDef<SupplierDocByDueDateRow>[] = [
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

export function ByDueDateTab({ rows, totals, loading }: Props) {
  if (!loading && rows.length === 0) {
    return <EmptyReportState message="No hay documentos pendientes para los filtros seleccionados" />;
  }
  return (
    <div className="space-y-3">
      <DataTable columns={columns} data={rows} />
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