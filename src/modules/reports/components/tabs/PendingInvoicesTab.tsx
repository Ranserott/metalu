import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { EmptyReportState } from "../EmptyReportState";
import { formatCLP, formatDate } from "../../utils/formatters";
import type { PendingInvoiceRow } from "../../types/report";

type Props = {
  rows: PendingInvoiceRow[];
  totals?: { saldo: number };
  loading: boolean;
};

const columns: ColumnDef<PendingInvoiceRow>[] = [
  { accessorKey: "issueDate", header: "Emisión", cell: ({ row }) => formatDate(row.original.issueDate) },
  { accessorKey: "dueDate", header: "Vencimiento", cell: ({ row }) => formatDate(row.original.dueDate) },
  { accessorKey: "number", header: "N° Factura" },
  { accessorKey: "clientName", header: "Cliente" },
  { accessorKey: "total", header: "Total", cell: ({ row }) => formatCLP(row.original.total) },
  { accessorKey: "saldo", header: "Saldo", cell: ({ row }) => formatCLP(row.original.saldo) },
  {
    accessorKey: "daysOverdue",
    header: "Días vencido",
    cell: ({ row }) =>
      row.original.daysOverdue == null ? (
        "—"
      ) : (
        <Badge variant="destructive">{row.original.daysOverdue}d</Badge>
      ),
  },
];

export function PendingInvoicesTab({ rows, totals, loading }: Props) {
  if (!loading && rows.length === 0) {
    return <EmptyReportState message="No hay facturas pendientes" />;
  }
  return (
    <div className="space-y-3">
      <DataTable columns={columns} data={rows} />
      {totals && rows.length > 0 && (
        <div className="flex justify-end gap-6 rounded-md border bg-gray-50 px-4 py-2 text-sm">
          <div>
            <span className="text-gray-500">Σ Saldo: </span>
            <span className="font-semibold">{formatCLP(totals.saldo)}</span>
          </div>
        </div>
      )}
    </div>
  );
}