import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { EmptyReportState } from "../EmptyReportState";
import { formatCLP, formatDate } from "../../utils/formatters";
import type { SaleRow } from "../../types/report";

type Props = {
  rows: SaleRow[];
  totals?: { neto: number; iva: number; total: number };
  loading: boolean;
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  ISSUED: "default",
  PAID: "default",
  OVERDUE: "destructive",
  CANCELLED: "outline",
};

const columns: ColumnDef<SaleRow>[] = [
  { accessorKey: "issueDate", header: "Emisión", cell: ({ row }) => formatDate(row.original.issueDate) },
  { accessorKey: "number", header: "N° Factura" },
  { accessorKey: "clientName", header: "Cliente" },
  { accessorKey: "neto", header: "Neto", cell: ({ row }) => formatCLP(row.original.neto) },
  { accessorKey: "iva", header: "IVA", cell: ({ row }) => formatCLP(row.original.iva) },
  { accessorKey: "total", header: "Total", cell: ({ row }) => formatCLP(row.original.total) },
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

export function SalesTab({ rows, totals, loading }: Props) {
  if (!loading && rows.length === 0) {
    return <EmptyReportState message="No hay ventas en el período seleccionado" />;
  }
  return (
    <div className="space-y-3">
      <DataTable columns={columns} data={rows} />
      {totals && rows.length > 0 && (
        <div className="flex justify-end gap-6 rounded-md border bg-gray-50 px-4 py-2 text-sm">
          <div>
            <span className="text-gray-500">Σ Neto: </span>
            <span className="font-semibold">{formatCLP(totals.neto)}</span>
          </div>
          <div>
            <span className="text-gray-500">Σ IVA: </span>
            <span className="font-semibold">{formatCLP(totals.iva)}</span>
          </div>
          <div>
            <span className="text-gray-500">Σ Total: </span>
            <span className="font-semibold">{formatCLP(totals.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}