import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { EmptyReportState } from "../EmptyReportState";
import { formatCLP, formatDate } from "../../utils/formatters";
import type { CartolaRow } from "../../types/report";

type Props = {
  rows: CartolaRow[];
  totals?: { cargos: number; abonos: number; saldoFinal: number };
  loading: boolean;
  clientSelected: boolean;
};

const columns: ColumnDef<CartolaRow>[] = [
  { accessorKey: "date", header: "Fecha", cell: ({ row }) => formatDate(row.original.date) },
  { accessorKey: "type", header: "Tipo" },
  { accessorKey: "documentNumber", header: "N° Documento" },
  { accessorKey: "detail", header: "Detalle" },
  {
    accessorKey: "charge",
    header: "Cargo",
    cell: ({ row }) => (row.original.charge ? formatCLP(row.original.charge) : "—"),
  },
  {
    accessorKey: "payment",
    header: "Abono",
    cell: ({ row }) => (row.original.payment ? formatCLP(row.original.payment) : "—"),
  },
  {
    accessorKey: "balance",
    header: "Saldo",
    cell: ({ row }) => formatCLP(row.original.balance),
  },
];

export function CartolaTab({ rows, totals, loading, clientSelected }: Props) {
  if (!clientSelected) {
    return (
      <EmptyReportState
        message="Seleccioná un cliente para ver su cartola"
        hint="Elegí un cliente en el filtro de arriba"
      />
    );
  }
  if (!loading && rows.length === 0) {
    return <EmptyReportState message="No hay movimientos para el rango seleccionado" />;
  }
  return (
    <div className="space-y-3">
      <DataTable columns={columns} data={rows} />
      {totals && rows.length > 0 && (
        <div className="flex justify-end gap-6 rounded-md border bg-gray-50 px-4 py-2 text-sm">
          <div>
            <span className="text-gray-500">Σ Cargos: </span>
            <span className="font-semibold">{formatCLP(totals.cargos)}</span>
          </div>
          <div>
            <span className="text-gray-500">Σ Abonos: </span>
            <span className="font-semibold">{formatCLP(totals.abonos)}</span>
          </div>
          <div>
            <span className="text-gray-500">Saldo final: </span>
            <span className="font-semibold">{formatCLP(totals.saldoFinal)}</span>
          </div>
        </div>
      )}
    </div>
  );
}