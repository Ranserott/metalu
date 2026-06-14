"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, X, User } from "lucide-react";
import { Encargado } from "../types/encargado";

type EncargadoFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (encargado: Encargado) => void;
  clientId: string;
  clientCode?: string;
  clientName?: string;
  edit?: Encargado | null;
};

const emptyValues = (clientId: string) => ({
  rut: "",
  name: "",
  email: "",
  phone: "",
  position: "",
  clientId,
});

export function EncargadoForm({
  open,
  onOpenChange,
  onSaved,
  clientId,
  clientCode,
  clientName,
  edit,
}: EncargadoFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState(emptyValues(clientId));

  useEffect(() => {
    if (edit) {
      setValues({
        rut: edit.rut,
        name: edit.name,
        email: edit.email || "",
        phone: edit.phone || "",
        position: edit.position || "",
        clientId: edit.clientId,
      });
    } else {
      setValues(emptyValues(clientId));
    }
    setError(null);
  }, [edit, clientId, open]);

  function update<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.rut.trim() || !values.name.trim()) {
      setError("RUT y Nombre son requeridos");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const url = edit ? `/api/encargados/${edit.id}` : "/api/encargados";
      const method = edit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${res.status}`);
      }

      const saved = (await res.json()) as Encargado;
      onSaved(saved);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}
    >
      <div className="bg-white rounded-xl shadow-2xl w-[600px] max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-[var(--theme-dark)] to-[var(--theme-primary)] px-6 py-4 flex items-center justify-between">
          <h2 className="text-white text-lg font-semibold flex items-center gap-2">
            <User className="w-5 h-5" />
            {edit ? "EDITAR ENCARGADO" : "AGREGAR ENCARGADO"}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-white hover:bg-white/20 rounded p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                RUT <span className="text-red-500">*</span>
              </label>
              <Input
                value={values.rut}
                onChange={(e) => update("rut", e.target.value)}
                placeholder="12.345.678-9"
                className="text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <Input
                value={values.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Nombre completo"
                className="text-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                Email
              </label>
              <Input
                type="email"
                value={values.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="email@ejemplo.cl"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                Teléfono
              </label>
              <Input
                value={values.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+56 9 1234 5678"
                className="text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
              Cargo
            </label>
            <Input
              value={values.position}
              onChange={(e) => update("position", e.target.value)}
              placeholder="Ej: Jefe de Compras"
              className="text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
              Cliente
            </label>
            <Input
              value={clientCode ? `${clientCode} - ${clientName || ""}` : ""}
              disabled
              className="text-sm bg-gray-50"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-gray-300 text-gray-700"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-dark)] hover:from-[var(--theme-dark)] hover:to-[var(--theme-darker)] text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {submitting ? "Guardando..." : edit ? "Guardar Cambios" : "Guardar Encargado"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
