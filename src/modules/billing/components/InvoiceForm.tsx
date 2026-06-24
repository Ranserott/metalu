"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Info,
  Calculator,
  Save,
  Trash2,
  Eraser,
  LogOut,
  Search,
  Plus,
  Upload,
  FileText,
} from "lucide-react";

const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const TODAY = new Date().toISOString().split("T")[0];

const TIPOS_DOCUMENTO = [
  "Factura Electrónica",
  "Boleta Electrónica",
  "Nota de Crédito",
  "Guía de Despacho",
] as const;

type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

type ItemRow = {
  description: string;
  quantity: number;
  unitPrice: number;
};

type GuiaRow = {
  numero: string;
  total: number;
};

type ClientOpt = { id: string; name: string; code: string };

const MAX_ITEMS = 10;
const MAX_GUIAS = 10;

function emptyItems(): ItemRow[] {
  return Array.from({ length: MAX_ITEMS }, () => ({
    description: "",
    quantity: 0,
    unitPrice: 0,
  }));
}

function emptyGuias(): GuiaRow[] {
  return Array.from({ length: MAX_GUIAS }, () => ({
    numero: "",
    total: 0,
  }));
}

export function InvoiceForm() {
  const router = useRouter();

  // ---- Header / doc data ----
  const [tipoDocumento, setTipoDocumento] =
    useState<TipoDocumento>("Factura Electrónica");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [rut, setRut] = useState("");
  const [clientId, setClientId] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [fechaDocumento, setFechaDocumento] = useState(TODAY);
  const [fechaVencimiento, setFechaVencimiento] = useState(TODAY);

  // ---- Resumen financiero ----
  const [netoManual, setNetoManual] = useState<number | null>(null);
  const [abonos, setAbonos] = useState(0);

  // ---- Tables ----
  const [items, setItems] = useState<ItemRow[]>(emptyItems());
  const [guias, setGuias] = useState<GuiaRow[]>(emptyGuias());

  // ---- UI state ----
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [clientModalSearch, setClientModalSearch] = useState("");

  useEffect(() => {
    fetch("/api/clients?activeOnly=true")
      .then((r) => r.json())
      .then((d) => setClients(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (clientSearchOpen) {
      setClientModalSearch(rut);
    }
  }, [clientSearchOpen, rut]);

  // ---- Derived values (auto-calculations) ----
  const itemsWithTotals = useMemo(
    () =>
      items.map((it) => ({
        ...it,
        total: (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
      })),
    [items],
  );

  const netoFromItems = useMemo(
    () => itemsWithTotals.reduce((sum, it) => sum + it.total, 0),
    [itemsWithTotals],
  );

  const neto = netoManual ?? netoFromItems;
  const iva = useMemo(() => neto * 0.19, [neto]);
  const total = useMemo(() => neto + iva, [neto, iva]);
  const saldo = useMemo(() => total - abonos, [total, abonos]);

  // ---- Items handlers ----
  function updateItem(idx: number, patch: Partial<ItemRow>) {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  // ---- Guias handlers ----
  function updateGuia(idx: number, patch: Partial<GuiaRow>) {
    setGuias((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  // ---- Lifecycle handlers ----
  function handleLimpia() {
    setTipoDocumento("Factura Electrónica");
    setNumeroDocumento("");
    setRut("");
    setClientId("");
    setClienteNombre("");
    setFechaDocumento(TODAY);
    setFechaVencimiento(TODAY);
    setNetoManual(null);
    setAbonos(0);
    setItems(emptyItems());
    setGuias(emptyGuias());
    setError(null);
  }

  function handleBorrar() {
    if (!confirm("¿Borrar todos los datos del formulario?")) return;
    handleLimpia();
  }

  async function handleGrabar() {
    setError(null);
    if (!clientId) {
      setError("Selecciona un cliente");
      return;
    }
    if (!fechaDocumento || !fechaVencimiento) {
      setError("Las fechas de documento y vencimiento son requeridas");
      return;
    }
    setSubmitting(true);
    try {
      const payloadItems = itemsWithTotals
        .filter((it) => it.description.trim() !== "" || it.total > 0)
        .map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          total: it.total,
        }));

      const payloadGuias = guias
        .filter((g) => g.numero.trim() !== "")
        .map((g) => ({
          numero: g.numero,
          total: g.total,
        }));

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: numeroDocumento || undefined,
          clientId,
          tipoDocumento,
          issueDate: fechaDocumento,
          dueDate: fechaVencimiento,
          subtotal: neto.toFixed(2),
          tax: iva.toFixed(2),
          total: total.toFixed(2),
          abonos,
          saldo,
          guiasAsociadas: JSON.stringify(payloadGuias),
          items: payloadItems,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al crear el documento");
        return;
      }
      const created = await res.json();
      router.push(`/billing/${created.id}`);
    } catch (e: any) {
      setError(e.message ?? "Error de red");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredClients = clients.filter((c) => {
    if (!clientModalSearch) return true;
    const q = clientModalSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ingresar Documento</h1>
          <p className="text-sm text-muted-foreground">
            Complete los datos del documento tributario.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold tracking-wide">
                    TIPO DOCUMENTO
                  </Label>
                  <Select
                    value={tipoDocumento}
                    onValueChange={(v) => v && setTipoDocumento(v as TipoDocumento)}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_DOCUMENTO.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold tracking-wide">
                    N° DOCUMENTO
                  </Label>
                  <Input
                    value={numeroDocumento}
                    onChange={(e) => setNumeroDocumento(e.target.value)}
                    placeholder="000000"
                    className="bg-yellow-50 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold tracking-wide">
                    RUT CLIENTE
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={rut}
                      onChange={(e) => {
                        setRut(e.target.value);
                        setClientSearchOpen(true);
                      }}
                      onFocus={() => setClientSearchOpen(true)}
                      placeholder="12.345.678-9"
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      size="icon"
                      className="bg-[#14679C] hover:bg-[#14679C]/90 shrink-0"
                      onClick={() => setClientSearchOpen((v) => !v)}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold tracking-wide">
                    NOMBRE / RAZÓN SOCIAL
                  </Label>
                  <Input
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    placeholder="Nombre completo del cliente"
                    readOnly={!!clientId}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold tracking-wide">
                    FECHA DOCUMENTO
                  </Label>
                  <Input
                    type="date"
                    value={fechaDocumento}
                    onChange={(e) => setFechaDocumento(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold tracking-wide">
                    FECHA VENCIMIENTO
                  </Label>
                  <Input
                    type="date"
                    value={fechaVencimiento}
                    onChange={(e) => setFechaVencimiento(e.target.value)}
                  />
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
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold tracking-wide">
                  NETO
                </Label>
                <Input
                  type="number"
                  value={neto}
                  onChange={(e) =>
                    setNetoManual(e.target.value === "" ? null : Number(e.target.value))
                  }
                  className="font-mono text-right"
                  placeholder="$0"
                />
                <p className="text-[10px] text-muted-foreground">
                  Se calcula desde los ítems. Editá para sobreescribir.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold tracking-wide">
                  IVA (19%)
                </Label>
                <Input
                  type="number"
                  value={iva}
                  readOnly
                  className="font-mono text-right bg-muted"
                  placeholder="$0"
                />
              </div>

              <hr />

              <div className="space-y-2">
                <Label className="text-xs font-semibold tracking-wide">
                  TOTAL
                </Label>
                <div className="rounded-md border-2 border-[#14679C] bg-[#14679C]/5 px-3 py-2 text-right">
                  <span className="text-2xl font-bold text-[#14679C]">
                    {clp.format(total)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold tracking-wide">
                  ABONOS
                </Label>
                <Input
                  type="number"
                  value={abonos}
                  onChange={(e) => setAbonos(Number(e.target.value) || 0)}
                  className="font-mono text-right"
                  placeholder="$0"
                />
              </div>

              <hr />

              <div className="space-y-2">
                <Label className="text-xs font-semibold tracking-wide">
                  SALDO
                </Label>
                <div className="rounded-md border-2 border-destructive bg-destructive/5 px-3 py-2 text-right">
                  <span className="text-2xl font-bold text-destructive">
                    {clp.format(saldo)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Section 3: Guías Asociadas */}
        <div className="lg:col-span-1">
          <Card>
            <div className="bg-[#14679C] px-4 py-2 flex items-center justify-between text-white rounded-t-xl">
              <span className="font-semibold text-sm uppercase tracking-wide">
                Guías Asociadas
              </span>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={() => {
                  // "+" agrega una fila editable nueva (ya hay 10 filas)
                  // dejamos el comportamiento como "agregar foco a la primera fila vacía"
                  const firstEmpty = guias.findIndex((g) => g.numero.trim() === "");
                  if (firstEmpty === -1) {
                        setError("Máximo 10 guías asociadas");
                        return;
                      }
                  const el = document.getElementById(`guia-numero-${firstEmpty}`);
                  el?.focus();
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-2">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="px-2 py-1 w-8">#</th>
                      <th className="px-2 py-1">NÚMERO</th>
                      <th className="px-2 py-1 w-24 text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guias.map((g, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-2 py-1 text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            id={`guia-numero-${idx}`}
                            value={g.numero}
                            onChange={(e) =>
                              updateGuia(idx, { numero: e.target.value })
                            }
                            placeholder="..."
                            className="h-7 text-xs"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            value={g.total}
                            onChange={(e) =>
                              updateGuia(idx, {
                                total: Number(e.target.value) || 0,
                              })
                            }
                            placeholder="0"
                            className="h-7 text-xs text-right font-mono"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>

        {/* Section 4: Detalle de Productos / Servicios */}
        <div className="lg:col-span-2">
          <Card>
            <div className="bg-[#14679C] px-4 py-2 flex items-center justify-between text-white rounded-t-xl">
              <span className="font-semibold text-sm uppercase tracking-wide">
                Detalle de Productos / Servicios
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={() => {
                  const firstEmpty = items.findIndex(
                    (it) => it.description.trim() === "",
                  );
                  if (firstEmpty === -1) {
                    setError("Máximo 10 ítems");
                    return;
                  }
                  const el = document.getElementById(`item-desc-${firstEmpty}`);
                  el?.focus();
                }}
              >
                <Upload className="h-3.5 w-3.5 mr-1" />
                Cargar Ítems
              </Button>
            </div>
            <div className="p-2">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="px-2 py-1 w-8">#</th>
                      <th className="px-2 py-1 w-16">CANT.</th>
                      <th className="px-2 py-1">DESCRIPCIÓN</th>
                      <th className="px-2 py-1 w-28 text-right">PRECIO</th>
                      <th className="px-2 py-1 w-28 text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsWithTotals.map((it, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-2 py-1 text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            value={it.quantity}
                            onChange={(e) =>
                              updateItem(idx, {
                                quantity: Number(e.target.value) || 0,
                              })
                            }
                            className="h-7 text-xs text-right font-mono"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            id={`item-desc-${idx}`}
                            value={it.description}
                            onChange={(e) =>
                              updateItem(idx, { description: e.target.value })
                            }
                            className="h-7 text-xs"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            type="number"
                            value={it.unitPrice}
                            onChange={(e) =>
                              updateItem(idx, {
                                unitPrice: Number(e.target.value) || 0,
                              })
                            }
                            className="h-7 text-xs text-right font-mono"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            value={it.total}
                            readOnly
                            className="h-7 text-xs text-right font-mono bg-muted"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={handleLimpia}
          disabled={submitting}
        >
          <Eraser className="h-4 w-4 mr-2" />
          LIMPIA
        </Button>
        <Button
          type="button"
          variant="outline"
          className="text-destructive border-destructive hover:bg-destructive/10"
          onClick={handleBorrar}
          disabled={submitting}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          BORRAR
        </Button>
        <Button
          type="button"
          onClick={handleGrabar}
          disabled={submitting}
          className="bg-[#14679C] hover:bg-[#14679C]/90"
        >
          <Save className="h-4 w-4 mr-2" />
          {submitting ? "Guardando..." : "GRABAR"}
        </Button>
        <Link href="/billing">
          <Button type="button" variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            SALIR
          </Button>
        </Link>
      </div>

      {/* Client picker Dialog */}
      <Dialog open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Buscar cliente</DialogTitle>
            <DialogDescription>
              Escribí el RUT (código) o el nombre del cliente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={clientModalSearch}
                onChange={(e) => setClientModalSearch(e.target.value)}
                placeholder="RUT o nombre del cliente"
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="max-h-96 overflow-y-auto space-y-1">
              {filteredClients.length === 0 && (
                <div className="text-sm text-muted-foreground p-4 text-center">
                  Sin resultados
                </div>
              )}
              {filteredClients.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setClientId(c.id);
                    setClienteNombre(c.name);
                    setRut(c.code);
                    setClientSearchOpen(false);
                  }}
                  className="w-full text-left p-3 hover:bg-muted rounded border"
                >
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {c.code}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
