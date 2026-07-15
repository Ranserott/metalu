"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Trash, Printer, Save, FileText, LogOut, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientModal } from "@/modules/quotations/components/ClientModal";
import { QuotationModal } from "@/modules/quotations/components/QuotationModal";
import { EncargadoSelector } from "@/modules/encargados/components/EncargadoSelector";
import { WorkOrderItemInput } from "../validations/workOrderSchemas";
import { WorkOrder } from "../types/workOrder";

type ClientInfo = { id: string; name: string };

type WorkOrderFormProps = {
  initialNumber?: string;
  initialData?: {
    id: string;
    number: string;
    clientId: string;
    clientName?: string;
    title: string;
    rut?: string | null;
    razonSocial?: string | null;
    entregadoPor?: string | null;
    celular?: string | null;
    quotationId?: string | null;
    fechaTrabajo?: Date | string | null;
    local?: string | null;
    encargado?: string | null;
    encargadoId?: string | null;
    condicionesPago?: string | null;
    nroFactura?: string | null;
    nroGuia?: string | null;
    tipoOC?: string | null;
    nroOrdenCompra?: string | null;
    fechaEntrega?: Date | string | null;
    plazoDias?: number | null;
    description?: string | null;
    descuentoPorcentaje?: number | string | null;
    materials?: Array<{
      material: string;
      quantity: number | string;
      unit?: string | null;
      unitPrice?: number | string | null;
      total?: number | string | null;
    }>;
  } | null;
  editMode?: boolean;
  /**
   * When true, hide Grabar/Imprimir/Borrar buttons and leave only
   * "Guardar Borrador" — supervisor is locked to DRAFT world.
   * Server side also forces status=DRAFT on POST, this prop just shapes the UI.
   */
  forceDraft?: boolean;
  onSubmit: (data: Record<string, any>, items: WorkOrderItemInput[]) => Promise<WorkOrder | null>;
  onCancel: () => void;
};

type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" });

const LOCALES = [
  "CASA MATRIZ",
  "SUCURSAL 1",
];

function mapQuotationToState(q: any) {
  return {
    razonSocial: q.client?.name ?? "",
    rut: q.client?.code ?? "",
    titulo: q.descripcionTrabajo ?? "",
    entregadoPor: q.atencion ?? "",
    observaciones: q.notes ?? "",
    plazoDias: (() => {
      const d = q.plazoEntrega;
      if (d == null || d === "") return "";
      const n = typeof d === "number" ? d : parseFloat(String(d));
      return Number.isFinite(n) ? n : "";
    })(),
    descuentoPorcentaje: (() => {
      if (q.discountType === "PERCENTAGE" && q.discount) {
        const n = typeof q.discount === "number" ? q.discount : parseFloat(String(q.discount));
        return Number.isFinite(n) ? n : "";
      }
      return "";
    })(),
    client: q.client ? { id: q.client.id, name: q.client.name } : null,
    items: (q.items ?? []).map((it: any) => ({
      description: it.description ?? "",
      quantity:
        typeof it.quantity === "number"
          ? it.quantity
          : parseFloat(String(it.quantity ?? 1)) || 1,
      unitPrice:
        typeof it.unitPrice === "number"
          ? it.unitPrice
          : parseFloat(String(it.unitPrice ?? 0)) || 0,
    })),
  };
}

export function WorkOrderForm({ initialNumber, initialData, editMode, forceDraft, onSubmit, onCancel }: WorkOrderFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [quotationModalOpen, setQuotationModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientInfo | null>(null);
  const [selectedQuotationLabel, setSelectedQuotationLabel] = useState("");
  const [quotationLoading, setQuotationLoading] = useState(false);
  const [lastAppliedQuotationId, setLastAppliedQuotationId] = useState<string | null>(null);

  const [number] = useState(initialData?.number ?? initialNumber ?? "");
  const [titulo, setTitulo] = useState("");

  const [rut, setRut] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [entregadoPor, setEntregadoPor] = useState("");
  const [celular, setCelular] = useState("");

  const [nroCotizacion, setNroCotizacion] = useState("");
  const [fechaTrabajo, setFechaTrabajo] = useState("");
  const [local, setLocal] = useState("CASA MATRIZ");
  const [encargadoId, setEncargadoId] = useState<string | null>(null);
  const [encargadoName, setEncargadoName] = useState("");
  const [condicionesPago, setCondicionesPago] = useState("30 DÍAS CRÉDITO");

  const [nroFactura, setNroFactura] = useState("");
  const [nroGuia, setNroGuia] = useState("");
  const [tipoOC, setTipoOC] = useState("ORDEN INTERNO");
  const [nroOrdenCompra, setNroOrdenCompra] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [plazoDias, setPlazoDias] = useState<number | "">("");

  const [items, setItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);
  const [observaciones, setObservaciones] = useState("");
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState<number | "">("");

  useEffect(() => {
    if (selectedClient) {
      setRazonSocial(selectedClient.name);
    }
  }, [selectedClient]);

  // Seed form state when entering edit mode
  useEffect(() => {
    if (!editMode || !initialData) return;

    const toDateInput = (v: Date | string | null | undefined) => {
      if (!v) return "";
      const d = typeof v === "string" ? new Date(v) : v;
      if (Number.isNaN(d.getTime())) return "";
      return d.toISOString().split("T")[0];
    };
    const toNum = (v: any): number | "" => {
      if (v === null || v === undefined || v === "") return "";
      const n = typeof v === "number" ? v : parseFloat(String(v));
      return Number.isFinite(n) ? n : "";
    };

    setTitulo(initialData.title ?? "");
    setRut(initialData.rut ?? "");
    setRazonSocial(initialData.razonSocial ?? initialData.clientName ?? "");
    setEntregadoPor(initialData.entregadoPor ?? "");
    setCelular(initialData.celular ?? "");
    setNroCotizacion(initialData.quotationId ?? "");
    setFechaTrabajo(toDateInput(initialData.fechaTrabajo));
    setLocal(initialData.local ?? "CASA MATRIZ");
    setEncargadoId(initialData.encargadoId ?? null);
    setEncargadoName(initialData.encargado ?? "");
    setCondicionesPago(initialData.condicionesPago ?? "30 DÍAS CRÉDITO");
    setNroFactura(initialData.nroFactura ?? "");
    setNroGuia(initialData.nroGuia ?? "");
    setTipoOC(initialData.tipoOC ?? "ORDEN INTERNO");
    setNroOrdenCompra(initialData.nroOrdenCompra ?? "");
    setFechaEntrega(toDateInput(initialData.fechaEntrega));
    setPlazoDias(toNum(initialData.plazoDias) as number | "");
    setObservaciones(initialData.description ?? "");
    setDescuentoPorcentaje(toNum(initialData.descuentoPorcentaje) as number | "");

    const seedItems: LineItem[] = (initialData.materials ?? [])
      .filter((m) => m.material && m.material.trim() !== "")
      .map((m) => ({
        description: m.material,
        quantity: typeof m.quantity === "number" ? m.quantity : parseFloat(String(m.quantity)) || 1,
        unitPrice:
          typeof m.unitPrice === "number"
            ? m.unitPrice
            : parseFloat(String(m.unitPrice ?? 0)) || 0,
      }));
    setItems(seedItems.length > 0 ? seedItems : [{ description: "", quantity: 1, unitPrice: 0 }]);

    if (initialData.clientId) {
      setSelectedClient({
        id: initialData.clientId,
        name: initialData.clientName ?? initialData.razonSocial ?? "",
      });
    }
  }, [editMode, initialData]);

  function handleClientSelect(client: ClientInfo) {
    setSelectedClient(client);
    setClientModalOpen(false);
  }

  async function applyQuotation(quotationId: string) {
    if (quotationId === lastAppliedQuotationId) return;
    setQuotationLoading(true);
    try {
      const res = await fetch(`/api/quotations/${quotationId}`);
      if (!res.ok) throw new Error("Error al cargar cotización");
      const q = await res.json();
      const mapped = mapQuotationToState(q);
      const isFirstApply = lastAppliedQuotationId === null;

      if (isFirstApply) {
        setRazonSocial((cur) => (cur === "" ? mapped.razonSocial : cur));
        setRut((cur) => (cur === "" ? mapped.rut : cur));
        setTitulo((cur) => (cur === "" ? mapped.titulo : cur));
        setEntregadoPor((cur) => (cur === "" ? mapped.entregadoPor : cur));
        setObservaciones((cur) => (cur === "" ? mapped.observaciones : cur));
        setPlazoDias((cur) => (cur === "" ? mapped.plazoDias : cur));
        setDescuentoPorcentaje((cur) => (cur === "" ? mapped.descuentoPorcentaje : cur));
        if (!selectedClient && mapped.client) {
          setSelectedClient(mapped.client);
        }
        setItems((cur) => {
          const isDefault =
            cur.length === 1 &&
            cur[0].description === "" &&
            cur[0].quantity === 1 &&
            cur[0].unitPrice === 0;
          if (!isDefault) return cur;
          return mapped.items.length > 0 ? mapped.items : cur;
        });
      } else {
        setRazonSocial(mapped.razonSocial);
        setRut(mapped.rut);
        setTitulo(mapped.titulo);
        setEntregadoPor(mapped.entregadoPor);
        setObservaciones(mapped.observaciones);
        setPlazoDias(mapped.plazoDias);
        setDescuentoPorcentaje(mapped.descuentoPorcentaje);
        if (mapped.client) {
          setSelectedClient(mapped.client);
        }
        setItems(
          mapped.items.length > 0 ? mapped.items : [{ description: "", quantity: 1, unitPrice: 0 }]
        );
      }

      setLastAppliedQuotationId(quotationId);
    } catch (err) {
      console.error("[WorkOrderForm] applyQuotation error:", err);
      alert("No se pudo cargar la cotización para autocompletar");
    } finally {
      setQuotationLoading(false);
    }
  }

  function addLine() {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0 }]);
  }

  function removeLine(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateLine(index: number, field: keyof LineItem, value: any) {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    setItems(next);
  }

  function resetForm() {
    setSelectedClient(null);
    setRut("");
    setRazonSocial("");
    setEntregadoPor("");
    setCelular("");
    setNroCotizacion("");
    setSelectedQuotationLabel("");
    setLastAppliedQuotationId(null);
    setFechaTrabajo("");
    setLocal("CASA MATRIZ");
    setEncargadoId(null);
    setEncargadoName("");
    setCondicionesPago("30 DÍAS CRÉDITO");
    setNroFactura("");
    setNroGuia("");
    setTipoOC("ORDEN INTERNO");
    setNroOrdenCompra("");
    setFechaEntrega("");
    setPlazoDias("");
    setItems([{ description: "", quantity: 1, unitPrice: 0 }]);
    setObservaciones("");
    setDescuentoPorcentaje("");
  }

  const neto = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const descuento =
    descuentoPorcentaje === "" ? 0 : (neto * Number(descuentoPorcentaje)) / 100;
  const subtotalAfecto = Math.max(0, neto - descuento);
  const iva = subtotalAfecto * 0.19;
  const total = subtotalAfecto + iva;

  function buildPayload(status: "DRAFT" | "IN_PROGRESS" = "IN_PROGRESS"): { payload: Record<string, any>; itemsPayload: WorkOrderItemInput[] } | null {
    if (!selectedClient) {
      alert("Debe seleccionar un cliente");
      return null;
    }
    if (!titulo.trim()) {
      alert("Debe ingresar un título");
      return null;
    }

    const payload: Record<string, any> = {
      ...(editMode && initialData?.id ? { id: initialData.id } : {}),
      number,
      clientId: selectedClient.id,
      title: titulo,
      status,
      priority: "MEDIUM",
      dueDate: fechaEntrega || new Date().toISOString().split("T")[0],
      rut: rut || null,
      razonSocial: razonSocial || null,
      entregadoPor: entregadoPor || null,
      celular: celular || null,
      fechaTrabajo: fechaTrabajo || null,
      local: local || null,
      encargado: encargadoName || null,
      encargadoId: encargadoId || null,
      condicionesPago: condicionesPago || null,
      nroFactura: nroFactura || null,
      nroGuia: nroGuia || null,
      tipoOC: tipoOC || null,
      nroOrdenCompra: nroOrdenCompra || null,
      fechaEntrega: fechaEntrega || null,
      plazoDias: plazoDias === "" ? null : Number(plazoDias),
      neto: neto.toFixed(2),
      descuentoPorcentaje: descuentoPorcentaje === "" ? null : Number(descuentoPorcentaje),
      subtotalAfecto: subtotalAfecto.toFixed(2),
      iva: iva.toFixed(2),
      total: total.toFixed(2),
      description: observaciones || null,
      quotationId: nroCotizacion || null,
    };

    const itemsPayload: WorkOrderItemInput[] = items
      .filter((it) => it.description.trim() !== "")
      .map((it) => ({
        material: it.description,
        quantity: it.quantity,
        unit: "UN",
        unitPrice: it.unitPrice,
        total: it.quantity * it.unitPrice,
      }));

    return { payload, itemsPayload };
  }

  async function handleSave(status: "DRAFT" | "IN_PROGRESS" = "IN_PROGRESS") {
    const built = buildPayload(status);
    if (!built) return;
    const { payload, itemsPayload } = built;

    setSubmitting(true);
    try {
      const saved = await onSubmit(payload, itemsPayload);
      if (saved) {
        resetForm();
      }
    } catch (err) {
      console.error("[WorkOrderForm] save error:", err);
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePrint() {
    const built = buildPayload();
    if (!built) return;
    const { payload, itemsPayload } = built;

    setPrinting(true);
    try {
      // Save first (modal will close via parent). Capture new OT to fetch PDF.
      const saved = await onSubmit(payload, itemsPayload);
      if (!saved) return;

      // Fetch PDF from the existing API and trigger browser print dialog
      const res = await fetch(`/api/work-orders/${saved.id}/pdf`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al generar el PDF");
      }
      const blob = await res.blob();
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
          console.error("[WorkOrderForm] print failed:", err);
        } finally {
          setTimeout(() => {
            iframe.remove();
            URL.revokeObjectURL(url);
          }, 1000);
        }
      };
    } catch (err) {
      console.error("[WorkOrderForm] print error:", err);
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Top header cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* INFORMACIÓN DEL CLIENTE */}
        <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
          <div className="bg-[var(--theme-primary)] px-4 py-2 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-white" />
            <span className="text-white font-semibold text-xs uppercase tracking-wide">
              Información del Cliente
            </span>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="text-[11px] font-semibold uppercase text-gray-600 mb-1 block tracking-wide">
                RUT Cliente
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={rut}
                  onChange={(e) => setRut(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="default"
                  className="bg-[var(--theme-primary)] hover:bg-[var(--theme-dark)]"
                  onClick={() => setClientModalOpen(true)}
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase text-gray-600 mb-1 block tracking-wide">
                Razon Social
              </label>
              <input
                type="text"
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold uppercase text-gray-600 mb-1 block tracking-wide">
                  Entregado Por
                </label>
                <input
                  type="text"
                  value={entregadoPor}
                  onChange={(e) => setEntregadoPor(e.target.value)}
                  placeholder="Nombre de quien entrega"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-gray-600 mb-1 block tracking-wide">
                  Celular
                </label>
                <input
                  type="text"
                  value={celular}
                  onChange={(e) => setCelular(e.target.value)}
                  placeholder="+56 9..."
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* DETALLES DE OPERACIÓN */}
        <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
          <div className="bg-[var(--theme-primary)] px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-white" />
              <span className="text-white font-semibold text-xs uppercase tracking-wide">
                Detalles de Operación
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white text-[11px] font-semibold uppercase tracking-wide">
                Trabajo N°:
              </span>
              <span className="bg-[var(--theme-light)] text-[var(--theme-dark)] px-2 py-0.5 rounded text-sm font-bold">
                {number}
              </span>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="text-[11px] font-semibold uppercase text-gray-600 mb-1 block tracking-wide">
                N° Cotización
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={selectedQuotationLabel}
                  readOnly
                  placeholder="Seleccionar cotización..."
                  className="flex-1 h-9 px-3 py-1 text-sm bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:border-[var(--theme-primary)]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuotationModalOpen(true)}
                  className="h-9 px-3 border-[var(--theme-primary)] text-[var(--theme-primary)] hover:bg-[var(--theme-light)]/30"
                  title="Buscar cotización"
                >
                  <Search className="w-4 h-4" />
                </Button>
                {nroCotizacion && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNroCotizacion("");
                      setSelectedQuotationLabel("");
                    }}
                    className="h-9 px-2"
                    title="Quitar"
                  >
                    ×
                  </Button>
                )}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase text-gray-600 mb-1 block tracking-wide">
                Título
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Descripción breve del trabajo"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold uppercase text-gray-600 mb-1 block tracking-wide">
                  Fecha Trabajo
                </label>
                <input
                  type="date"
                  value={fechaTrabajo}
                  onChange={(e) => setFechaTrabajo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-gray-600 mb-1 block tracking-wide">
                  Local
                </label>
                <Select value={local} onValueChange={(v) => v && setLocal(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCALES.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase text-gray-600 mb-1 block tracking-wide">
                Encargado
              </label>
              <EncargadoSelector
                value={encargadoId}
                clientId={selectedClient?.id ?? null}
                onChange={(id, enc) => {
                  setEncargadoId(id);
                  setEncargadoName(enc?.name || "");
                }}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase text-gray-600 mb-1 block tracking-wide">
                Condiciones Pago
              </label>
              <Input
                value={condicionesPago}
                onChange={(e) => setCondicionesPago(e.target.value)}
                placeholder="Ej: 30 DÍAS CRÉDITO"
              />
            </div>
          </div>
        </div>

        {/* DOCUMENTOS & PLAZOS */}
        <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
          <div className="bg-[var(--theme-primary)] px-4 py-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-white" />
            <span className="text-white font-semibold text-xs uppercase tracking-wide">
              Documentos & Plazos
            </span>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold uppercase text-gray-600 mb-1 block tracking-wide">
                  N° Factura
                </label>
                <input
                  type="text"
                  value={nroFactura}
                  onChange={(e) => setNroFactura(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-gray-600 mb-1 block tracking-wide">
                  N° Guía
                </label>
                <input
                  type="text"
                  value={nroGuia}
                  onChange={(e) => setNroGuia(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold uppercase text-gray-600 mb-1 block tracking-wide">
                  Tipo O.C.
                </label>
                <input
                  type="text"
                  value={tipoOC}
                  onChange={(e) => setTipoOC(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-gray-600 mb-1 block tracking-wide">
                  N° Orden Compra
                </label>
                <input
                  type="text"
                  value={nroOrdenCompra}
                  onChange={(e) => setNroOrdenCompra(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold uppercase text-gray-600 mb-1 block tracking-wide">
                  Fecha Entrega
                </label>
                <input
                  type="date"
                  value={fechaEntrega}
                  onChange={(e) => setFechaEntrega(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-gray-600 mb-1 block tracking-wide">
                  Plazo (Días)
                </label>
                <input
                  type="number"
                  value={plazoDias}
                  onChange={(e) => setPlazoDias(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body: lines + observations + totals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: lines + observations */}
        <div className="lg:col-span-2 space-y-4">
          {/* LÍNEAS */}
          <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
            <div className="bg-[var(--theme-primary)] px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-white" />
                <span className="text-white font-semibold text-xs uppercase tracking-wide">
                  Líneas de Trabajo / Materiales
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                className="bg-[var(--theme-primary)] hover:bg-[var(--theme-dark)] text-white"
                onClick={addLine}
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar Línea
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-[11px] uppercase text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left w-12">###</th>
                    <th className="px-3 py-2 text-right w-24">Cantidad</th>
                    <th className="px-3 py-2 text-left">Descripción</th>
                    <th className="px-3 py-2 text-right w-28">Valor Unit.</th>
                    <th className="px-3 py-2 text-right w-32">Total</th>
                    <th className="px-3 py-2 text-center w-20">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={it.quantity || ""}
                          onChange={(e) => updateLine(i, "quantity", parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={it.description}
                          onChange={(e) => updateLine(i, "description", e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={it.unitPrice || ""}
                          onChange={(e) => updateLine(i, "unitPrice", parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {clp.format(it.quantity * it.unitPrice)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeLine(i)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* OBSERVACIONES */}
          <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
            <div className="bg-[var(--theme-primary)] px-4 py-2">
              <span className="text-white font-semibold text-xs uppercase tracking-wide">
                Observaciones del Pedido
              </span>
            </div>
            <div className="p-4">
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={5}
                placeholder="Escriba aquí notas adicionales, especificaciones de entrega o detalles técnicos..."
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm resize-none"
              />
            </div>
          </div>
        </div>

        {/* Right: Totals */}
        <div className="lg:col-span-1">
          <div className="border rounded-lg overflow-hidden shadow-sm bg-white sticky top-2">
            <div className="p-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Neto Total:</span>
                <span className="font-medium">{clp.format(neto)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">(-) Descuento (%):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={descuentoPorcentaje}
                    onChange={(e) =>
                      setDescuentoPorcentaje(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                  />
                  <span className="text-gray-500 text-xs">%</span>
                </div>
              </div>
              {descuentoPorcentaje !== "" && descuentoPorcentaje > 0 && (
                <div className="flex justify-between text-red-600 text-xs -mt-1">
                  <span className="ml-auto">-{clp.format(descuento)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-700">Subtotal Afecto:</span>
                <span className="font-medium">{clp.format(subtotalAfecto)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">I.V.A (19%):</span>
                <span>{clp.format(iva)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-[var(--theme-primary)] pt-2 text-lg font-bold">
                <span className="text-[var(--theme-dark)]">TOTAL:</span>
                <span className="text-[var(--theme-dark)]">{clp.format(total)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-gray-600 text-xs font-semibold uppercase tracking-wide">
                  Trabajo N°:
                </span>
                <span className="bg-[var(--theme-light)] text-[var(--theme-dark)] px-2 py-0.5 rounded text-sm font-bold">
                  {number}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="sticky bottom-0 bg-white border-t p-4 -mx-6 px-6 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleSave("DRAFT")}
            disabled={submitting}
          >
            <FileText className="w-4 h-4 mr-2" />
            Guardar Borrador
          </Button>
          {!forceDraft && (
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={submitting}
              className="bg-[var(--theme-dark)] hover:bg-[var(--theme-darker)] text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {submitting ? "Grabando..." : "Grabar"}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={resetForm}>
            Limpiar
          </Button>
        </div>
        <div className="flex gap-2">
          {!forceDraft && (
            <Button type="button" variant="outline" onClick={handlePrint} disabled={printing || submitting}>
              {printing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Printer className="w-4 h-4 mr-2" />
              )}
              {printing ? "Preparando..." : "Imprimir"}
            </Button>
          )}
          {!forceDraft && (
            <Button type="button" variant="outline" className="text-red-500 border-red-300 hover:bg-red-50">
              <Trash className="w-4 h-4 mr-2" />
              Borrar
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onCancel}>
            <LogOut className="w-4 h-4 mr-2" />
            Salir
          </Button>
        </div>
      </div>

      <ClientModal open={clientModalOpen} onOpenChange={setClientModalOpen} onSelect={handleClientSelect} />
      <QuotationModal
        open={quotationModalOpen}
        onOpenChange={setQuotationModalOpen}
        onSelect={(q) => {
          setNroCotizacion(q.id);
          setSelectedQuotationLabel(q.number);
          applyQuotation(q.id);
        }}
      />
    </div>
  );
}
