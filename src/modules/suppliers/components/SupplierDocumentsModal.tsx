"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Supplier } from "../types/supplier";
import {
  SupplierDocument,
  SUPPLIER_DOCUMENT_TYPE_LABELS,
  SUPPLIER_DOCUMENT_TYPE_OPTIONS,
} from "../types/supplierDocument";
import { SupplierDocumentInput } from "../validations/supplierDocumentSchemas";
import { Trash2, FileText } from "lucide-react";

type Props = {
  supplier: Supplier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const EMPTY_FORM: SupplierDocumentInput = {
  nombre: "",
  tipoDocumento: "FACTURA",
  documento: "",
  fechaDocumento: new Date(),
  valor: 0,
  fechaVencimiento: new Date(),
  estado: "",
};

function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("es-CL");
}

function dateInputValue(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

function toNumber(v: string): number {
  if (!v) return 0;
  const n = parseFloat(v.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function SupplierDocumentsModal({ supplier, open, onOpenChange }: Props) {
  const [documents, setDocuments] = useState<SupplierDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierDocumentInput>(EMPTY_FORM);

  async function fetchDocuments() {
    if (!supplier) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}/documents`);
      if (!res.ok) throw new Error("Error al cargar documentos");
      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message ?? "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && supplier) {
      fetchDocuments();
      setForm(EMPTY_FORM);
    }
  }, [open, supplier?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplier) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        fechaDocumento: form.fechaDocumento.toISOString(),
        fechaVencimiento: form.fechaVencimiento.toISOString(),
        valor: Number(form.valor),
      };
      const res = await fetch(`/api/suppliers/${supplier.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "Error al guardar documento");
      }
      setForm(EMPTY_FORM);
      await fetchDocuments();
    } catch (err: any) {
      setError(err?.message ?? "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(docId: string) {
    if (!supplier) return;
    if (!confirm("¿Eliminar este documento?")) return;
    setDeletingId(docId);
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}/documents/${docId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error al eliminar");
      await fetchDocuments();
    } catch (err: any) {
      setError(err?.message ?? "Error desconocido");
    } finally {
      setDeletingId(null);
    }
  }

  if (!supplier) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="full" className="max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[var(--theme-dark)] text-lg font-bold">
            DETALLE PROVEEDOR — {supplier.name}
          </DialogTitle>
        </DialogHeader>

        {/* Supplier info card */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg text-sm">
          <div>
            <p className="text-xs text-gray-500 uppercase">Código</p>
            <p className="font-semibold">{supplier.code}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Contacto</p>
            <p className="font-semibold">{supplier.contact || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Email</p>
            <p className="font-semibold">{supplier.email || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Teléfono</p>
            <p className="font-semibold">{supplier.phone || "—"}</p>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Existing documents */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-[var(--theme-primary)]" />
            <h3 className="font-bold text-sm uppercase tracking-wide text-[var(--theme-dark)]">
              Documentos registrados
            </h3>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {documents.length}
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500 py-4 text-center">Cargando...</p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center border rounded-lg">
              No hay documentos para este proveedor.
            </p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-50">
                  <tr>
                    <th className="text-left p-2 font-semibold text-gray-600 uppercase text-xs">Nombre</th>
                    <th className="text-left p-2 font-semibold text-gray-600 uppercase text-xs">Tipo</th>
                    <th className="text-left p-2 font-semibold text-gray-600 uppercase text-xs">Documento</th>
                    <th className="text-left p-2 font-semibold text-gray-600 uppercase text-xs">F. Emisión</th>
                    <th className="text-right p-2 font-semibold text-gray-600 uppercase text-xs">Valor</th>
                    <th className="text-left p-2 font-semibold text-gray-600 uppercase text-xs">F. Vencimiento</th>
                    <th className="text-left p-2 font-semibold text-gray-600 uppercase text-xs">Estado</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className="border-t hover:bg-blue-50/40">
                      <td className="p-2 font-medium">{doc.nombre}</td>
                      <td className="p-2">{SUPPLIER_DOCUMENT_TYPE_LABELS[doc.tipoDocumento]}</td>
                      <td className="p-2 font-mono text-xs">{doc.documento}</td>
                      <td className="p-2 text-gray-700">{formatDate(doc.fechaDocumento)}</td>
                      <td className="p-2 text-right font-semibold">
                        {new Intl.NumberFormat("es-CL", {
                          style: "currency",
                          currency: "CLP",
                        }).format(Number(doc.valor))}
                      </td>
                      <td className="p-2 text-gray-700">{formatDate(doc.fechaVencimiento)}</td>
                      <td className="p-2">{doc.estado}</td>
                      <td className="p-2">
                        <button
                          onClick={() => handleDelete(doc.id)}
                          disabled={deletingId === doc.id}
                          title="Eliminar"
                          className="text-red-500 hover:text-red-700 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* New document form */}
        <div className="border-t pt-4">
          <h3 className="font-bold text-sm uppercase tracking-wide text-[var(--theme-dark)] mb-3">
            Ingresar nuevo documento
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold uppercase text-gray-600 mb-1 block tracking-wide">
                  Nombre
                </label>
                <Input
                  required
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Factura compra materiales"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-gray-600 mb-1 block tracking-wide">
                  Tipo Documento
                </label>
                <Select
                  value={form.tipoDocumento}
                  onValueChange={(v) =>
                    v && setForm({ ...form, tipoDocumento: v as SupplierDocumentInput["tipoDocumento"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue>
                      {(value: string) => SUPPLIER_DOCUMENT_TYPE_LABELS[value as keyof typeof SUPPLIER_DOCUMENT_TYPE_LABELS] ?? value}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPLIER_DOCUMENT_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {SUPPLIER_DOCUMENT_TYPE_LABELS[opt]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-gray-600 mb-1 block tracking-wide">
                  Documento
                </label>
                <Input
                  required
                  value={form.documento}
                  onChange={(e) => setForm({ ...form, documento: e.target.value })}
                  placeholder="Número o folio"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-gray-600 mb-1 block tracking-wide">
                  Estado
                </label>
                <Input
                  required
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                  placeholder="Ej: Pagado, Pendiente, etc."
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-gray-600 mb-1 block tracking-wide">
                  Fecha Documento
                </label>
                <Input
                  required
                  type="date"
                  value={dateInputValue(form.fechaDocumento)}
                  onChange={(e) => setForm({ ...form, fechaDocumento: new Date(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-gray-600 mb-1 block tracking-wide">
                  Fecha Vencimiento
                </label>
                <Input
                  required
                  type="date"
                  value={dateInputValue(form.fechaVencimiento)}
                  onChange={(e) => setForm({ ...form, fechaVencimiento: new Date(e.target.value) })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[11px] font-semibold uppercase text-gray-600 mb-1 block tracking-wide">
                  Valor
                </label>
                <Input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={form.valor || ""}
                  onChange={(e) => setForm({ ...form, valor: toNumber(e.target.value) })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-dark)] text-white"
              >
                {saving ? "Guardando..." : "Guardar Documento"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}