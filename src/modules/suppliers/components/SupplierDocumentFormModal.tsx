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
import { SupplierDocumentInput } from "../validations/supplierDocumentSchemas";
import {
  SUPPLIER_DOCUMENT_TYPE_LABELS,
  SUPPLIER_DOCUMENT_TYPE_OPTIONS,
} from "../types/supplierDocument";

type Props = {
  supplierId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
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

function dateInputValue(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

function toNumber(v: string): number {
  if (!v) return 0;
  const n = parseFloat(v.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function SupplierDocumentFormModal({ supplierId, open, onOpenChange, onSaved }: Props) {
  const [form, setForm] = useState<SupplierDocumentInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        fechaDocumento: form.fechaDocumento.toISOString(),
        fechaVencimiento: form.fechaVencimiento.toISOString(),
        valor: Number(form.valor),
      };
      const res = await fetch(`/api/suppliers/${supplierId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data.error === "string"
          ? data.error
          : Array.isArray(data.error)
            ? data.error.map((e: any) => e.message).join(", ")
            : "Error al guardar documento";
        throw new Error(msg);
      }
      setForm(EMPTY_FORM);
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message ?? "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-[var(--theme-dark)] text-lg font-bold">
            NUEVO DOCUMENTO
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
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
          <div className="grid grid-cols-2 gap-3">
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
          </div>
          <div>
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
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-dark)] text-white"
            >
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}