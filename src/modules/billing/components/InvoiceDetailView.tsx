"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Info, Calculator, FileText, Package } from "lucide-react";

const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  ISSUED: "default",
  PAID: "default",
  OVERDUE: "destructive",
  CANCELLED: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "BORRADOR",
  ISSUED: "EMITIDO",
  PAID: "PAGADO",
  OVERDUE: "VENCIDO",
  CANCELLED: "ANULADO",
};

const TYPE_LABEL: Record<string, string> = {
  INVOICE: "FACTURA",
  CREDIT_NOTE: "NOTA DE CRÉDITO",
};

type Guia = { numero: string; total: number; otNumber?: string };
type Item = {
  id?: string;
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  total: number | string;
};

type InvoiceLite = {
  id: string;
  number: string;
  clientId: string;
  workOrderId: string | null;
  type: string;
  status: string;
  series: string;
  numberInSeries: number;
  issueDate: Date | string;
  dueDate: Date | string;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  paidAt: Date | string | null;
  createdAt: Date | string;
  tipoDocumento?: string | null;
  abonos?: number | string | null;
  saldo?: number | string | null;
  guiasAsociadas?: string | null;
  client?: { id: string; code: string; name: string } | null;
  items?: Item[];
};

type CurrentUser = { id: string; role: "admin" | "trabajador" };

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CL");
}

function toNum(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function parseGuias(raw: string | null | undefined): Guia[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((g) => g && (g.numero || g.total))
        .map((g) => ({
          numero: String(g.numero ?? ""),
          total: toNum(g.total),
          otNumber: g.otNumber ? String(g.otNumber) : undefined,
        }));
    }
  } catch {
    // ignore parse errors — fall through to empty
  }
  return [];
}

export function InvoiceDetailView({
  invoice,
  currentUser,
}: {
  invoice: InvoiceLite;
  currentUser: CurrentUser;
}) {
  const guias = useMemo(() => parseGuias(invoice.guiasAsociadas), [invoice.guiasAsociadas]);
  const items = useMemo<Item[]>(
    () => (invoice.items ?? []).filter((it) => it && (it.description || toNum(it.total) > 0)),
    [invoice.items],
  );

  const isAdmin = currentUser.role === "admin";

  const tipoDocumento = invoice.tipoDocumento ?? "Factura Electrónica";
  const subtotal = toNum(invoice.subtotal);
  const tax = toNum(invoice.tax);
  const total = toNum(invoice.total);
  const abonos = toNum(invoice.abonos);
  const saldo = invoice.saldo != null ? toNum(invoice.saldo) : Math.max(total - abonos, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/billing">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-mono">{invoice.number}</h1>
            <p className="text-sm text-muted-foreground">
              {tipoDocumento} · {TYPE_LABEL[invoice.type] ?? invoice.type} ·{" "}
              {invoice.client?.name ?? invoice.clientId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[invoice.status] ?? "secondary"} className="px-3 py-1 text-xs">
            STATUS: {STATUS_LABEL[invoice.status] ?? invoice.status}
          </Badge>
          {isAdmin && (
            <Link href={`/billing/${invoice.id}/edit`}>
              <Button className="bg-[#14679C] hover:bg-[#14679C]/90">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Section 1: Datos de Documento */}
        <div className="lg:col-span-2">
          <Card>
            <div className="bg-gradient-to-r from-[#14679C] to-[#0d4f7a] px-4 py-2 flex items-center gap-2 text-white rounded-t-xl">
              <Info className="h-4 w-4" />
              <span className="font-semibold text-sm uppercase tracking-wide">
                Datos de Documento
              </span>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">TIPO DOCUMENTO</div>
                  <div className="font-semibold">{tipoDocumento}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">N° DOCUMENTO</div>
                  <div className="font-mono">{invoice.number}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">RUT CLIENTE</div>
                  <div className="font-mono">{invoice.client?.code ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">NOMBRE / RAZÓN SOCIAL</div>
                  <div>{invoice.client?.name ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">FECHA DOCUMENTO</div>
                  <div>{fmtDate(invoice.issueDate)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">FECHA VENCIMIENTO</div>
                  <div>{fmtDate(invoice.dueDate)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">SERIE</div>
                  <div className="font-mono">{invoice.series}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">N° EN SERIE</div>
                  <div className="font-mono">{invoice.numberInSeries}</div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Section 2: Resumen Financiero */}
        <div className="lg:col-span-1">
          <Card>
            <div className="bg-gradient-to-r from-[#14679C] to-[#0d4f7a] px-4 py-2 flex items-center gap-2 text-white rounded-t-xl">
              <Calculator className="h-4 w-4" />
              <span className="font-semibold text-sm uppercase tracking-wide">
                Resumen Financiero
              </span>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">NETO</span>
                <span className="font-mono">{clp.format(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">IVA (19%)</span>
                <span className="font-mono">{clp.format(tax)}</span>
              </div>
              <hr />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wide">TOTAL</span>
                <span className="text-2xl font-bold text-[#14679C]">
                  {clp.format(total)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">ABONOS</span>
                <span className="font-mono">{clp.format(abonos)}</span>
              </div>
              <hr />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wide">SALDO</span>
                <span className="text-2xl font-bold text-destructive">
                  {clp.format(saldo)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Section 3: Guías Asociadas */}
        <div className="lg:col-span-1">
          <Card>
            <div className="bg-[#14679C] px-4 py-2 flex items-center gap-2 text-white rounded-t-xl">
              <FileText className="h-4 w-4" />
              <span className="font-semibold text-sm uppercase tracking-wide">
                Guías Asociadas
              </span>
            </div>
            <div className="p-2">
              {guias.length === 0 ? (
                <div className="p-4 text-xs text-muted-foreground text-center">
                  Sin guías asociadas
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="px-2 py-1 w-8">#</th>
                        <th className="px-2 py-1">NÚMERO</th>
                        <th className="px-2 py-1 w-28">OT</th>
                        <th className="px-2 py-1 w-24 text-right">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guias.map((g, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-2 py-1 text-muted-foreground">{idx + 1}</td>
                          <td className="px-2 py-1 font-mono">{g.numero || "—"}</td>
                          <td className="px-2 py-1 font-mono whitespace-nowrap">
                            {g.otNumber ? (
                              <span className="inline-flex items-center rounded bg-[#14679C]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#14679C]">
                                {g.otNumber}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-2 py-1 text-right font-mono">
                            {clp.format(g.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Section 4: Detalle de Productos / Servicios */}
        <div className="lg:col-span-2">
          <Card>
            <div className="bg-[#14679C] px-4 py-2 flex items-center gap-2 text-white rounded-t-xl">
              <Package className="h-4 w-4" />
              <span className="font-semibold text-sm uppercase tracking-wide">
                Detalle de Productos / Servicios
              </span>
            </div>
            <div className="p-2">
              {items.length === 0 ? (
                <div className="p-4 text-xs text-muted-foreground text-center">
                  Sin ítems registrados
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="px-2 py-1 w-8">#</th>
                        <th className="px-2 py-1 w-16 text-right">CANT.</th>
                        <th className="px-2 py-1">DESCRIPCIÓN</th>
                        <th className="px-2 py-1 w-28 text-right">PRECIO</th>
                        <th className="px-2 py-1 w-28 text-right">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => (
                        <tr key={it.id ?? idx} className="border-t">
                          <td className="px-2 py-1 text-muted-foreground">{idx + 1}</td>
                          <td className="px-2 py-1 text-right font-mono">
                            {toNum(it.quantity)}
                          </td>
                          <td className="px-2 py-1">{it.description || "—"}</td>
                          <td className="px-2 py-1 text-right font-mono">
                            {clp.format(toNum(it.unitPrice))}
                          </td>
                          <td className="px-2 py-1 text-right font-mono">
                            {clp.format(toNum(it.total))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex justify-between gap-2 pt-4 border-t">
        <Link href="/billing">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        {isAdmin && (
          <Link href={`/billing/${invoice.id}/edit`}>
            <Button className="bg-[#14679C] hover:bg-[#14679C]/90">
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
