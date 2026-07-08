import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { EmptyReportState } from "../EmptyReportState";
import { formatCLP } from "../../utils/formatters";
import type { BalanceRow } from "../../types/report";

type Props = {
  rows: BalanceRow[];
  totals?: { saldoActual: number };
  loading: boolean;
};

const columns: ColumnDef<BalanceRow>[] = [
  { accessorKey: "clientName", header: "Cliente" },
  { accessorKey: "clientCode", header: "Código" },
  {
    accessorKey: "totalFacturado",
    header: "Total facturado",
    cell: ({ row }) => formatCLP(row.original.totalFacturado),
  },
  {
    accessorKey: "totalPagado",
    header: "Total pagado",
    cell: ({ row }) => formatCLP(row.original.totalPagado),
  },
  {
    accessorKey: "totalNotasCredito",
    header: "Notas crédito",
    cell: ({ row }) => formatCLP(row.original.totalNotasCredito),
  },
  {
    accessorKey: "saldoActual",
    header: "Saldo actual",
    cell: ({ row }) => (
      <span
        className={
          row.original.saldoActual > 0
            ? "font-semibold text-red-600"
            : row.original.saldoActual < 0
              ? "font-semibold text-blue-600"
              : ""
        }
      >
        {formatCLP(row.original.saldoActual)}
      </span>
    ),
  },
];

export function BalancesTab({ rows, totals, loading }: Props) {
  if (!loading && rows.length === 0) {
    return <EmptyReportState message="No hay clientes con movimientos" />;
  }
  return (
    <div className="space-y-3">
      <DataTable columns={columns} data={rows} />
      {totals && rows.length > 0 && (
        <div className="flex justify-end gap-6 rounded-md border bg-gray-50 px-4 py-2 text-sm">
          <div>
            <span className="text-gray-500">Deuda total cartera: </span>
            <span className="font-semibold">{formatCLP(totals.saldoActual)}</span>
          </div>
        </div>
      )}
    </div>
  );
}