"use client";

import { useState } from "react";
import { Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkOrder, WorkOrderItem } from "../types/workOrder";

type Props = {
  workOrder: WorkOrder & {
    materials?: WorkOrderItem[];
    client?: { id: string; name: string; code?: string | null; address?: string | null; city?: string | null };
  };
};

const statusLabels: Record<string, string> = {
  TODO: "Pendiente",
  IN_PROGRESS: "En Progreso",
  QUALITY_CHECK: "Control de Calidad",
  COMPLETED: "Completado",
};

const statusColors: Record<string, string> = {
  TODO: "bg-gray-100 text-gray-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  QUALITY_CHECK: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
};

const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" });

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CL");
}

function n(v: number | string | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const parsed = parseFloat(v);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function WorkOrderDetailView({ workOrder }: Props) {
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

  const items = workOrder.materials ?? [];
  const itemsTotal = items.reduce((sum, i) => sum + n(i.total ?? 0), 0);

  const neto = n(workOrder.neto);
  const descuentoPct = n(workOrder.descuentoPorcentaje);
  const descuentoAmount =
    descuentoPct > 0 ? Math.round((neto * descuentoPct) / 100) : 0;
  const subtotalAfecto = n(workOrder.subtotalAfecto);
  const iva = n(workOrder.iva);
  const total = n(workOrder.total);

  async function handlePrint() {
    setPrintError(null);
    setPrinting(true);
    try {
      const res = await fetch(`/api/work-orders/${workOrder.id}/pdf`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al generar el PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Trabajo-${workOrder.number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setPrintError(err?.message ?? "Error desconocido");
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Trabajo {workOrder.number}</h1>
          <p className="text-sm text-muted-foreground">
            {workOrder.client?.name || workOrder.razonSocial || "—"}
          </p>
        </div>
        <Button
          onClick={handlePrint}
          disabled={printing}
          className="bg-[#14679C] hover:bg-[#14679C]/90"
        >
          {printing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Printer className="h-4 w-4 mr-2" />
          )}
          {printing ? "Generando PDF..." : "Imprimir PDF"}
        </Button>
      </div>

      {printError && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {printError}
        </div>
      )}

      {/* Header info */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="text-xs text-gray-500 uppercase">Título</p>
          <p className="font-semibold">{workOrder.title || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Estado</p>
          <span
            className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
              statusColors[workOrder.status] || ""
            }`}
          >
            {statusLabels[workOrder.status] || workOrder.status}
          </span>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Cliente</p>
          <p className="font-semibold">
            {workOrder.client?.name || workOrder.razonSocial || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">RUT</p>
          <p className="font-semibold">{workOrder.rut || workOrder.client?.code || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Fecha Trabajo</p>
          <p className="font-semibold">{fmtDate(workOrder.fechaTrabajo)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Plazo Entrega</p>
          <p className="font-semibold">
            {workOrder.plazoDias != null ? `${workOrder.plazoDias} días` : "—"}
          </p>
        </div>
        {workOrder.entregadoPor && (
          <div className="col-span-2">
            <p className="text-xs text-gray-500 uppercase">Entregado por</p>
            <p className="font-semibold">{workOrder.entregadoPor}</p>
          </div>
        )}
        {workOrder.description && (
          <div className="col-span-2">
            <p className="text-xs text-gray-500 uppercase">Descripción</p>
            <p className="text-sm">{workOrder.description}</p>
          </div>
        )}
      </div>

      {/* Materials */}
      {items.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm uppercase tracking-wide text-[var(--theme-dark)] flex items-center gap-2">
              <span className="inline-block w-1 h-5 bg-[var(--theme-primary)] rounded-sm" />
              Detalle de Materiales
            </h3>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {items.length} {items.length === 1 ? "ítem" : "ítems"}
            </span>
          </div>
          <div className="border rounded-lg overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-50">
                <tr>
                  <th className="text-left p-2.5 font-semibold text-gray-600 uppercase text-xs tracking-wide">
                    Material
                  </th>
                  <th className="text-right p-2.5 font-semibold text-gray-600 uppercase text-xs tracking-wide w-24">
                    Cant.
                  </th>
                  <th className="text-right p-2.5 font-semibold text-gray-600 uppercase text-xs tracking-wide w-32">
                    P. Unit.
                  </th>
                  <th className="text-right p-2.5 font-semibold text-gray-600 uppercase text-xs tracking-wide w-36">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr
                    key={(it as any).id ?? idx}
                    className="border-t hover:bg-blue-50/40 transition-colors"
                  >
                    <td className="p-2.5 border-l-4 border-transparent hover:border-[var(--theme-primary)]">
                      <span className="font-semibold text-gray-800 text-base">
                        {it.material}
                      </span>
                    </td>
                    <td className="p-2.5 text-right text-gray-700">
                      {Number(it.quantity).toLocaleString("es-CL")}
                      {it.unit ? ` ${it.unit}` : ""}
                    </td>
                    <td className="p-2.5 text-right text-gray-700">
                      {clp.format(n(it.unitPrice ?? 0))}
                    </td>
                    <td className="p-2.5 text-right font-bold text-[var(--theme-dark)]">
                      {clp.format(n(it.total ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Sub-Total Neto:</span>
          <span className="font-medium">{clp.format(neto)}</span>
        </div>
        {descuentoPct > 0 && (
          <div className="flex justify-between text-sm text-red-600">
            <span>(-) Descuento {descuentoPct}%:</span>
            <span className="font-medium">-{clp.format(descuentoAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Neto:</span>
          <span className="font-medium">{clp.format(subtotalAfecto)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">IVA:</span>
          <span>{clp.format(iva)}</span>
        </div>
        <div className="flex justify-between text-base font-bold border-t pt-2">
          <span>Total:</span>
          <span className="text-[var(--theme-dark)]">{clp.format(total)}</span>
        </div>
      </div>
    </div>
  );
}

export default WorkOrderDetailView;