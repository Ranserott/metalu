"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { EmptyReportState } from "../EmptyReportState";
import { formatCLP, formatDate } from "@/modules/reports/utils/formatters";
import { SUPPLIER_DOCUMENT_TYPE_LABELS } from "@/modules/suppliers/types/supplierDocument";
import type {
  SupplierDocBySupplierRow,
  SupplierDocBySupplierTotals,
} from "../../types/report";

type DisplayRow =
  | { kind: "header"; supplierId: string; supplierName: string; subtotal: number; count: number }
  | { kind: "doc"; row: SupplierDocBySupplierRow };

type Props = {
  rows: SupplierDocBySupplierRow[];
  totals?: SupplierDocBySupplierTotals;
  loading: boolean;
};

const columns: ColumnDef<DisplayRow>[] = [
  {
    id: "primary",
    header: "Fecha Vencimiento / Tipo",
    cell: ({ row }) => {
      const r = row.original;
      if (r.kind === "header") {
        return (
          <span className="font-bold text-[var(--theme-dark)]">
            {r.supplierName}
          </span>
        );
      }
      return formatDate(r.row.fechaVencimiento);
    },
  },
  {
    id: "tipo",
    header: "Tipo",
    cell: ({ row }) => {
      const r = row.original;
      if (r.kind === "header") return null;
      return SUPPLIER_DOCUMENT_TYPE_LABELS[r.row.tipoDocumento];
    },
  },
  {
    id: "nombre",
    header: "Nombre",
    cell: ({ row }) => {
      const r = row.original;
      if (r.kind === "header") return null;
      return r.row.nombre;
    },
  },
  {
    id: "documento",
    header: "N° Documento",
    cell: ({ row }) => {
      const r = row.original;
      if (r.kind === "header") return null;
      return r.row.documento;
    },
  },
  {
    id: "valor",
    header: "Valor",
    cell: ({ row }) => {
      const r = row.original;
      if (r.kind === "header") {
        return (
          <span className="font-semibold text-blue-700">
            {formatCLP(r.subtotal)} ({r.count} docs)
          </span>
        );
      }
      return <span className="text-right block">{formatCLP(r.row.valor)}</span>;
    },
  },
];

function buildDisplayRows(rows: SupplierDocBySupplierRow[]): DisplayRow[] {
  // 1) Compute group aggregates
  const groups = new Map<string, { supplierName: string; subtotal: number; count: number }>();
  for (const r of rows) {
    const g = groups.get(r.supplierId);
    if (g) {
      g.subtotal += r.valor;
      g.count += 1;
    } else {
      groups.set(r.supplierId, { supplierName: r.supplierName, subtotal: r.valor, count: 1 });
    }
  }

  // 2) Emit header at top of each group, then its docs
  const out: DisplayRow[] = [];
  for (const r of rows) {
    const g = groups.get(r.supplierId)!;
    const alreadyPushed = out.some(
      (x) => x.kind === "header" && x.supplierId === r.supplierId
    );
    if (!alreadyPushed) {
      out.push({
        kind: "header",
        supplierId: r.supplierId,
        supplierName: g.supplierName,
        subtotal: g.subtotal,
        count: g.count,
      });
    }
    out.push({ kind: "doc", row: r });
  }

  return out;
}

export function BySupplierTab({ rows, totals, loading }: Props) {
  if (!loading && rows.length === 0) {
    return <EmptyReportState message="No hay documentos pendientes por proveedor" />;
  }

  const display = buildDisplayRows(rows);

  return (
    <div className="space-y-3">
      <DataTable columns={columns} data={display} />
      {totals && rows.length > 0 && (
        <div className="flex justify-end gap-6 rounded-md border bg-gray-50 px-4 py-2 text-sm">
          <div>
            <span className="text-gray-500">Σ Valor: </span>
            <span className="font-semibold">{formatCLP(totals.total)}</span>
          </div>
          <div>
            <span className="text-gray-500">Docs: </span>
            <span className="font-semibold">{totals.count}</span>
          </div>
        </div>
      )}
    </div>
  );
}
