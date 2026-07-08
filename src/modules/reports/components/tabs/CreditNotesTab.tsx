import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { EmptyReportState } from "../EmptyReportState";
import { formatCLP, formatDate } from "../../utils/formatters";
import type { CreditNoteRow } from "../../types/report";

type Props = {
  rows: CreditNoteRow[];
  totals?: { total: number };
  loading: boolean;
};

const columns: ColumnDef<CreditNoteRow>[] = [
  { accessorKey: "issueDate", header: "Emisión", cell: ({ row }) => formatDate(row.original.issueDate) },
  { accessorKey: "number", header: "N° NC" },
  { accessorKey: "clientName", header: "Cliente" },
  { accessorKey: "total", header: "Total", cell: ({ row }) => formatCLP(row.original.total) },
];

export function CreditNotesTab({ rows, totals, loading }: Props) {
  if (!loading && rows.length === 0) {
    return <EmptyReportState message="No hay notas de crédito en el período seleccionado" />;
  }
  return (
    <div className="space-y-3">
      <DataTable columns={columns} data={rows} />
      {totals && rows.length > 0 && (
        <div className="flex justify-end gap-6 rounded-md border bg-gray-50 px-4 py-2 text-sm">
          <div>
            <span className="text-gray-500">Σ Total: </span>
            <span className="font-semibold">{formatCLP(totals.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}