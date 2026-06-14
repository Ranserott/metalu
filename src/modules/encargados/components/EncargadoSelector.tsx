"use client";

import { useState, useEffect } from "react";
import { Plus, Search } from "lucide-react";
import { Encargado } from "../types/encargado";
import { EncargadoForm } from "./EncargadoForm";

type Props = {
  value: string | null;
  onChange: (encargadoId: string | null, encargado: Encargado | null) => void;
  clientId?: string | null;
  className?: string;
};

export function EncargadoSelector({ value, onChange, clientId, className }: Props) {
  const [encargados, setEncargados] = useState<Encargado[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/encargados");
        if (!res.ok) throw new Error("Error al cargar encargados");
        const data = (await res.json()) as Encargado[];
        if (!cancelled) setEncargados(data);
      } catch (err) {
        console.error("[EncargadoSelector] load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = encargados.filter((e) => {
    if (!e.isActive) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      e.rut.toLowerCase().includes(q) ||
      e.client.name.toLowerCase().includes(q)
    );
  });

  const grouped = filtered.reduce<Record<string, Encargado[]>>((acc, e) => {
    const key = e.client.name;
    (acc[key] ||= []).push(e);
    return acc;
  }, {});

  const selected = encargados.find((e) => e.id === value) || null;

  function pick(enc: Encargado) {
    onChange(enc.id, enc);
    setOpen(false);
    setSearch("");
  }

  function clear() {
    onChange(null, null);
  }

  function openCreate() {
    if (!clientId) {
      alert("Selecciona primero un cliente");
      return;
    }
    setFormOpen(true);
  }

  function handleCreated(saved: Encargado) {
    setEncargados((prev) => [...prev, saved]);
    onChange(saved.id, saved);
  }

  return (
    <div className={`relative ${className || ""}`}>
      {selected && !open ? (
        <div className="flex items-center gap-2 border border-gray-300 rounded px-3 py-2 bg-white">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {selected.name}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {selected.rut} · {selected.client.name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs text-blue-600 hover:underline"
          >
            Cambiar
          </button>
          <button
            type="button"
            onClick={clear}
            className="text-xs text-red-600 hover:underline"
          >
            Quitar
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 border border-gray-300 rounded px-3 py-2 bg-white">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setOpen(true)}
              placeholder="Buscar encargado por nombre, RUT o cliente..."
              className="flex-1 text-sm outline-none"
            />
            {loading && <span className="text-xs text-gray-400">cargando...</span>}
          </div>

          {open && (
            <div className="absolute z-50 mt-1 w-full bg-white border rounded shadow-lg max-h-72 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-4">
                  Sin resultados
                </p>
              ) : (
                Object.entries(grouped).map(([clientName, list]) => (
                  <div key={clientName}>
                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-gray-500 bg-gray-50 border-b">
                      {clientName}
                    </div>
                    {list.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => pick(e)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {e.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {e.rut}
                            {e.position ? ` · ${e.position}` : ""}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ))
              )}
              <button
                type="button"
                onClick={openCreate}
                className="w-full text-left px-3 py-2 border-t bg-gray-50 hover:bg-blue-50 text-sm text-[var(--theme-dark)] font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Agregar nuevo encargado
              </button>
            </div>
          )}
        </>
      )}

      {clientId && (
        <EncargadoForm
          open={formOpen}
          onOpenChange={setFormOpen}
          onSaved={handleCreated}
          clientId={clientId}
        />
      )}
    </div>
  );
}
