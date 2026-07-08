"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { EmptyReportState } from "../EmptyReportState";
import { formatCLP, formatDate } from "@/modules/reports/utils/formatters";
import type {
  DailySummaryRow,
  DailySummaryTotals,
} from "../../types/report";

type Props = {
  rows: DailySummaryRow[];
  totals?: DailySummaryTotals;
  loading: boolean;
};

function EstadoCell({ count, total }: { count: number; total: number }) {
  if (count === 0) return <span className="text-gray-400">—</span>;
  return (
    <div className="text-right">
      <div className="font-semibold">{formatCLP(total)}</div>
      <div className="text-xs text-gray-500">{count} docs</div>
    </div>
  );
}

const columns: ColumnDef<DailySummaryRow>[] = [
  {
    accessorKey: "fecha",
    header: "Fecha",
    cell: ({ row }) => formatDate(row.original.fecha),
  },
  {
    id: "pendiente",
    header: "Pendiente",
    cell: ({ row }) => (
      <EstadoCell
        count={row.original.pendiente.count}
        total={row.original.pendiente.total}
      />
    ),
  },
  {
    id: "pagado",
    header: "Pagado",
    cell: ({ row }) => (
      <EstadoCell
        count={row.original.pagado.count}
        total={row.original.pagado.total}
      />
    ),
  },
  {
    id: "cancelado",
    header: "Cancelado",
    cell: ({ row }) => (
      <EstadoCell
        count={row.original.cancelado.count}
        total={row.original.cancelado.total}
      />
    ),
  },
  {
    accessorKey: "totalDelDia",
    header: "Total del día",
    cell: ({ row }) => (
      <span className="font-semibold text-blue-700">
        {formatCLP(row.original.totalDelDia)}
      </span>
    ),
  },
];

export function DailySummaryTab({ rows, totals, loading }: Props) {
  if (!loading && rows.length === 0) {
    return <EmptyReportState message="No hay documentos en el período seleccionado" />;
  }
  return (
    <div className="space-y-3">
      <DataTable columns={columns} data={rows} />
      {totals && rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 rounded-md border bg-gray-50 px-4 py-2 text-sm">
          <div>
            <span className="text-gray-500 block text-xs">Pendiente</span>
            <span className="font-semibold">{formatCLP(totals.pendiente.total)}</span>
            <span className="text-xs text-gray-500 ml-1">({totals.pendiente.count})</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs">Pagado</span>
            <span className="font-semibold">{formatCLP(totals.pagado.total)}</span>
            <span className="text-xs text-gray-500 ml-1">({totals.pagado.count})</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs">Cancelado</span>
            <span className="font-semibold">{formatCLP(totals.cancelado.total)}</span>
            <span className="text-xs text-gray-500 ml-1">({totals.cancelado.count})</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs">Docs</span>
            <span className="font-semibold">{totals.count}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs">Total</span>
            <span className="font-semibold text-blue-700">{formatCLP(totals.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
