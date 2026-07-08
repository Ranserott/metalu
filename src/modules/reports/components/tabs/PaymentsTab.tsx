import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { EmptyReportState } from "../EmptyReportState";
import { formatCLP, formatDate } from "../../utils/formatters";
import type { PaymentRow } from "../../types/report";

type Props = {
  rows: PaymentRow[];
  totals?: { monto: number };
  loading: boolean;
};

const METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  BANK_TRANSFER: "Transferencia",
  CHECK: "Cheque",
  CARD: "Tarjeta",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  PENDIENTE: "secondary",
  PAGADO: "default",
  CANCELLED: "destructive",
};

const columns: ColumnDef<PaymentRow>[] = [
  { accessorKey: "date", header: "Fecha pago", cell: ({ row }) => formatDate(row.original.date) },
  { accessorKey: "number", header: "N° Pago" },
  {
    accessorKey: "clientName",
    header: "Cliente",
    cell: ({ row }) => row.original.clientName ?? "—",
  },
  {
    accessorKey: "method",
    header: "Método",
    cell: ({ row }) => METHOD_LABELS[row.original.method] ?? row.original.method,
  },
  { accessorKey: "amount", header: "Monto", cell: ({ row }) => formatCLP(row.original.amount) },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => (
      <Badge variant={STATUS_VARIANTS[row.original.status] || "secondary"}>
        {row.original.status}
      </Badge>
    ),
  },
];

export function PaymentsTab({ rows, totals, loading }: Props) {
  if (!loading && rows.length === 0) {
    return <EmptyReportState message="No hay pagos en el período seleccionado" />;
  }
  return (
    <div className="space-y-3">
      <DataTable columns={columns} data={rows} />
      {totals && rows.length > 0 && (
        <div className="flex justify-end gap-6 rounded-md border bg-gray-50 px-4 py-2 text-sm">
          <div>
            <span className="text-gray-500">Σ Monto: </span>
            <span className="font-semibold">{formatCLP(totals.monto)}</span>
          </div>
        </div>
      )}
    </div>
  );
}