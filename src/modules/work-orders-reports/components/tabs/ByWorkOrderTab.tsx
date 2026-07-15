"use client";

import { Loader2 } from "lucide-react";
import { EmptyReportState } from "../EmptyReportState";
import type {
  ByWorkOrderRow,
  ByWorkOrderTotals,
} from "../../types/report";

type Props = {
  rows: ByWorkOrderRow[];
  totals?: ByWorkOrderTotals;
  loading: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  TODO: "Pendiente",
  IN_PROGRESS: "En progreso",
  COMPLETED: "Completado",
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-slate-200 text-slate-700",
  TODO: "bg-gray-100 text-gray-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
};

const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function fmtDate(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("es-CL");
}

export function ByWorkOrderTab({ rows, totals, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        Cargando...
      </div>
    );
  }

  if (rows.length === 0) {
    return <EmptyReportState message="No hay trabajos que coincidan con los filtros" />;
  }

  return (
    <div className="space-y-3">
      <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2 font-semibold text-gray-600 uppercase text-xs tracking-wide">
                OT
              </th>
              <th className="text-left p-2 font-semibold text-gray-600 uppercase text-xs tracking-wide">
                Fecha Trab.
              </th>
              <th className="text-left p-2 font-semibold text-gray-600 uppercase text-xs tracking-wide">
                Cliente
              </th>
              <th className="text-left p-2 font-semibold text-gray-600 uppercase text-xs tracking-wide">
                Local
              </th>
              <th className="text-left p-2 font-semibold text-gray-600 uppercase text-xs tracking-wide">
                Estado
              </th>
              <th className="text-left p-2 font-semibold text-gray-600 uppercase text-xs tracking-wide">
                Factura
              </th>
              <th className="text-left p-2 font-semibold text-gray-600 uppercase text-xs tracking-wide">
                Guía
              </th>
              <th className="text-left p-2 font-semibold text-gray-600 uppercase text-xs tracking-wide max-w-xs">
                Descripción
              </th>
              <th className="text-right p-2 font-semibold text-gray-600 uppercase text-xs tracking-wide">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-t hover:bg-blue-50/40 transition-colors"
              >
                <td className="p-2 font-semibold text-gray-800">{row.number}</td>
                <td className="p-2 text-gray-700 whitespace-nowrap">
                  {fmtDate(row.fechaTrabajo)}
                </td>
                <td className="p-2 text-gray-700">{row.clientName}</td>
                <td className="p-2 text-gray-700">{row.local ?? "—"}</td>
                <td className="p-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                      STATUS_BADGE[row.status] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {STATUS_LABELS[row.status] ?? row.status}
                  </span>
                </td>
                <td className="p-2 text-gray-700">{row.nroFactura ?? "—"}</td>
                <td className="p-2 text-gray-700">{row.nroGuia ?? "—"}</td>
                <td
                  className="p-2 text-gray-700 max-w-xs truncate"
                  title={row.description ?? ""}
                >
                  {row.description ?? "—"}
                </td>
                <td className="p-2 text-right font-semibold text-[var(--theme-dark)] whitespace-nowrap">
                  {clp.format(row.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totals && rows.length > 0 && (
        <div className="flex justify-end gap-6 rounded-md border bg-gray-50 px-4 py-3 text-sm">
          <div>
            <span className="text-gray-500">Σ Total: </span>
            <span className="font-bold text-blue-700">
              {clp.format(totals.totalAmount)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Trabajos: </span>
            <span className="font-semibold">{totals.count}</span>
          </div>
        </div>
      )}
    </div>
  );
}