"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Pencil, Power, UserCog, Plus, Mail, Phone } from "lucide-react";
import { Encargado } from "../types/encargado";
import { EncargadoForm } from "./EncargadoForm";

type Props = {
  clientId: string;
  clientCode?: string;
  clientName?: string;
};

export function EncargadoListSection({ clientId, clientCode, clientName }: Props) {
  const [encargados, setEncargados] = useState<Encargado[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Encargado | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<Encargado | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchEncargados = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/encargados?clientId=${clientId}`);
      if (!res.ok) throw new Error("Error al cargar encargados");
      const data = (await res.json()) as Encargado[];
      setEncargados(data);
    } catch (err: any) {
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchEncargados();
  }, [fetchEncargados, refreshKey]);

  function handleSaved(_saved: Encargado) {
    setRefreshKey((k) => k + 1);
  }

  function openCreate() {
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(enc: Encargado) {
    setEditTarget(enc);
    setFormOpen(true);
  }

  async function handleToggleActive(enc: Encargado) {
    if (enc.isActive) {
      setConfirmDeactivate(enc);
      return;
    }
    await patchActive(enc, true);
  }

  async function patchActive(enc: Encargado, isActive: boolean) {
    try {
      const res = await fetch(`/api/encargados/${enc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al actualizar");
      }
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      alert(err.message || "Error");
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2.5 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCog className="w-4 h-4 text-[var(--theme-dark)]" />
          <span className="font-semibold text-xs text-gray-700 uppercase tracking-wide">
            Encargados
          </span>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={openCreate}
          className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-dark)] text-white"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Agregar encargado
        </Button>
      </div>

      <div className="divide-y max-h-64 overflow-y-auto">
        {loading && <p className="text-center text-sm text-gray-400 py-6">Cargando...</p>}
        {error && !loading && (
          <p className="text-center text-sm text-red-500 py-6">{error}</p>
        )}
        {!loading && !error && encargados.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-6">
            No hay encargados registrados para este cliente. Hacé click en
            &quot;Agregar encargado&quot;.
          </p>
        )}
        {!loading &&
          !error &&
          encargados.map((enc) => (
            <div
              key={enc.id}
              className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-gray-50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {enc.name}
                  </p>
                  <span className="text-[10px] uppercase text-gray-500">
                    {enc.rut}
                  </span>
                  {enc.position && (
                    <span className="text-[10px] uppercase tracking-wide text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {enc.position}
                    </span>
                  )}
                  {!enc.isActive && (
                    <span className="text-[10px] uppercase tracking-wide text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                      Inactivo
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                  {enc.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {enc.email}
                    </span>
                  )}
                  {enc.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {enc.phone}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openEdit(enc)}
                  className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                  title="Editar"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActive(enc)}
                  className={`p-1.5 rounded ${
                    enc.isActive
                      ? "hover:bg-red-50 text-red-600"
                      : "hover:bg-green-50 text-green-600"
                  }`}
                  title={enc.isActive ? "Desactivar" : "Activar"}
                >
                  <Power className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
      </div>

      <EncargadoForm
        key={editTarget?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={handleSaved}
        clientId={clientId}
        clientCode={clientCode}
        clientName={clientName}
        edit={editTarget}
      />

      <ConfirmDialog
        open={!!confirmDeactivate}
        onOpenChange={(o) => !o && setConfirmDeactivate(null)}
        title="Desactivar encargado"
        description={`¿Desactivar a ${confirmDeactivate?.name}?`}
        confirmLabel="Desactivar"
        variant="destructive"
        onConfirm={async () => {
          if (confirmDeactivate) {
            await patchActive(confirmDeactivate, false);
          }
        }}
      />
    </div>
  );
}
