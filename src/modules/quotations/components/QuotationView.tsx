"use client";

import { useState } from "react";
import { Printer, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Quotation } from "../types/quotation";

type Props = {
  quotation: Quotation & {
    items?: Array<{
      id: string;
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
      type: "MATERIAL" | "WORK";
    }>;
  };
};

const statusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  SENT: "Enviado",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SENT: "bg-blue-100 text-blue-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" });

export function QuotationView({ quotation }: Props) {
  const [busy, setBusy] = useState<null | "download" | "print">(null);
  const [printError, setPrintError] = useState<string | null>(null);

  const materials = (quotation.items || []).filter((i) => i.type === "MATERIAL");
  const works = (quotation.items || []).filter((i) => i.type === "WORK");
  const materialsTotal = materials.reduce((sum, i) => sum + Number(i.total), 0);
  const worksTotal = works.reduce((sum, i) => sum + Number(i.total), 0);
  const subtotal = Number(quotation.subtotal);
  const tax = Number(quotation.tax);
  const total = Number(quotation.total);
  const discount = Number(quotation.discount ?? 0);
  const discountType = quotation.discountType ?? "NONE";

  const percentValue = subtotal > 0 ? Math.round((discount / subtotal) * 100) : 0;
  const discountLabel =
    discountType === "AMOUNT"
      ? "Descuento:"
      : discountType === "PERCENT"
      ? `Descuento (${percentValue}%):`
      : "Descuento:";

  async function fetchPdfBlob(): Promise<Blob> {
    const res = await fetch(`/api/quotations/${quotation.id}/pdf`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Error al generar el PDF");
    }
    return res.blob();
  }

  async function handleDownload() {
    setPrintError(null);
    setBusy("download");
    try {
      const blob = await fetchPdfBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Cotizacion-${quotation.number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setPrintError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setBusy(null);
    }
  }

  async function handlePrint() {
    setPrintError(null);
    setBusy("print");
    try {
      const blob = await fetchPdfBlob();
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          console.error("[quotation] print failed:", err);
        } finally {
          setTimeout(() => {
            iframe.remove();
            URL.revokeObjectURL(url);
          }, 1000);
        }
      };
    } catch (err: unknown) {
      setPrintError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Cotización {quotation.number}</h1>
          <p className="text-sm text-muted-foreground">{quotation.client?.name || "—"}</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleDownload}
            disabled={busy !== null}
            variant="outline"
            className="border-[#14679C] text-[#14679C] hover:bg-[#14679C]/10"
          >
            {busy === "download" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {busy === "download" ? "Generando..." : "Generar PDF"}
          </Button>
          <Button
            onClick={handlePrint}
            disabled={busy !== null}
            className="bg-[#14679C] hover:bg-[#14679C]/90"
          >
            {busy === "print" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            {busy === "print" ? "Preparando..." : "Imprimir"}
          </Button>
        </div>
      </div>

      {printError && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {printError}
        </div>
      )}

      {/* Header info */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="text-xs text-gray-500 uppercase">Número</p>
          <p className="font-semibold">{quotation.number}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Cliente</p>
          <p className="font-semibold">{quotation.client?.name || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Estado</p>
          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${statusColors[quotation.status] || ""}`}>
            {statusLabels[quotation.status] || quotation.status}
          </span>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Válido hasta</p>
          <p className="font-semibold">{new Date(quotation.validUntil).toLocaleDateString("es-CL")}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Creado por</p>
          <p className="font-semibold">{quotation.createdBy?.name || "—"}</p>
        </div>
        {quotation.notes && (
          <div className="col-span-2">
            <p className="text-xs text-gray-500 uppercase">Descripción</p>
            <p className="text-sm">{quotation.notes}</p>
          </div>
        )}
      </div>

      {/* Works */}
      {works.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm uppercase tracking-wide text-[var(--theme-dark)] flex items-center gap-2">
              <span className="inline-block w-1 h-5 bg-[var(--theme-primary)] rounded-sm" />
              I. Detalle de Trabajos Realizados
            </h3>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {works.length} {works.length === 1 ? "ítem" : "ítems"}
            </span>
          </div>
          <div className="border rounded-lg overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-50">
                <tr>
                  <th className="text-left p-2.5 font-semibold text-gray-600 uppercase text-xs tracking-wide">Descripción</th>
                  <th className="text-right p-2.5 font-semibold text-gray-600 uppercase text-xs tracking-wide w-24">Cant.</th>
                  <th className="text-right p-2.5 font-semibold text-gray-600 uppercase text-xs tracking-wide w-32">P. Unit.</th>
                  <th className="text-right p-2.5 font-semibold text-gray-600 uppercase text-xs tracking-wide w-36">Total</th>
                </tr>
              </thead>
              <tbody>
                {works.map((item) => (
                  <tr key={item.id} className="border-t hover:bg-blue-50/40 transition-colors">
                    <td className="p-2.5 border-l-4 border-transparent hover:border-[var(--theme-primary)]">
                      <span className="font-semibold text-gray-800 text-base">{item.description}</span>
                    </td>
                    <td className="p-2.5 text-right text-gray-700">{Number(item.quantity).toLocaleString("es-CL")}</td>
                    <td className="p-2.5 text-right text-gray-700">{clp.format(Number(item.unitPrice))}</td>
                    <td className="p-2.5 text-right font-bold text-[var(--theme-dark)]">{clp.format(Number(item.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Materials */}
      {materials.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm uppercase tracking-wide text-[var(--theme-dark)] flex items-center gap-2">
              <span className="inline-block w-1 h-5 bg-[var(--theme-primary)] rounded-sm" />
              II. Detalle de Materiales
            </h3>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {materials.length} {materials.length === 1 ? "ítem" : "ítems"}
            </span>
          </div>
          <div className="border rounded-lg overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-50">
                <tr>
                  <th className="text-left p-2.5 font-semibold text-gray-600 uppercase text-xs tracking-wide">Descripción</th>
                  <th className="text-right p-2.5 font-semibold text-gray-600 uppercase text-xs tracking-wide w-24">Cant.</th>
                  <th className="text-right p-2.5 font-semibold text-gray-600 uppercase text-xs tracking-wide w-32">P. Unit.</th>
                  <th className="text-right p-2.5 font-semibold text-gray-600 uppercase text-xs tracking-wide w-36">Total</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((item) => (
                  <tr key={item.id} className="border-t hover:bg-blue-50/40 transition-colors">
                    <td className="p-2.5 border-l-4 border-transparent hover:border-[var(--theme-primary)]">
                      <span className="font-semibold text-gray-800 text-base">{item.description}</span>
                    </td>
                    <td className="p-2.5 text-right text-gray-700">{Number(item.quantity).toLocaleString("es-CL")}</td>
                    <td className="p-2.5 text-right text-gray-700">{clp.format(Number(item.unitPrice))}</td>
                    <td className="p-2.5 text-right font-bold text-[var(--theme-dark)]">{clp.format(Number(item.total))}</td>
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
          <span className="text-gray-600">Materiales:</span>
          <span className="font-medium">{clp.format(materialsTotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Trabajos:</span>
          <span className="font-medium">{clp.format(worksTotal)}</span>
        </div>
        <div className="flex justify-between text-sm border-t pt-2">
          <span className="text-gray-600">Subtotal:</span>
          <span className="font-medium">{clp.format(subtotal)}</span>
        </div>
        {discountType !== "NONE" && discount > 0 && (
          <div className="flex justify-between text-sm text-red-600">
            <span>{discountLabel}</span>
            <span className="font-medium">-{clp.format(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm border-t pt-2">
          <span className="text-gray-600">Subtotal Afecto:</span>
          <span className="font-medium">{clp.format(Math.max(0, subtotal - discount))}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">IVA (19%):</span>
          <span>{clp.format(tax)}</span>
        </div>
        <div className="flex justify-between text-base font-bold border-t pt-2">
          <span>Total:</span>
          <span className="text-[var(--theme-dark)]">{clp.format(total)}</span>
        </div>
      </div>
    </div>
  );
}