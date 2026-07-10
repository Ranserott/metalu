"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type {
  ClientOption,
  EncargadoOption,
  LocalOption,
  WorkOrderReportFilters,
  WorkOrderReportType,
} from "../types/report";

const STATUS_OPTIONS = [
  { value: "TODO", label: "Pendiente" },
  { value: "IN_PROGRESS", label: "En progreso" },
  { value: "QUALITY_CHECK", label: "Control de calidad" },
  { value: "COMPLETED", label: "Completado" },
] as const;

const FACTURADO_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "yes", label: "Facturado" },
  { value: "no", label: "No facturado" },
] as const;

type Props = {
  activeTab: WorkOrderReportType;
  clients: ClientOption[];
  locales: LocalOption[];
  encargados: EncargadoOption[];
  filters: WorkOrderReportFilters;
  onChange: (next: WorkOrderReportFilters) => void;
};

export function WorkOrderReportFilters({
  activeTab,
  clients,
  locales,
  encargados,
  filters,
  onChange,
}: Props) {
  const filteredEncargados = filters.clientId
    ? encargados.filter((e) => e.clientId === filters.clientId)
    : encargados;

  function set<K extends keyof WorkOrderReportFilters>(
    key: K,
    value: WorkOrderReportFilters[K] | undefined
  ) {
    const next: WorkOrderReportFilters = { ...filters, [key]: value };
    // When client changes, reset encargado so we don't keep a stale id from a different client.
    if (key === "clientId" && filters.encargadoId) {
      const stillValid = encargados.some(
        (e) => e.id === filters.encargadoId && e.clientId === value
      );
      if (!stillValid) next.encargadoId = undefined;
    }
    onChange(next);
  }

  function clearAll() {
    onChange({});
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border bg-gray-50/50 p-4">
      <div className="flex flex-wrap items-end gap-4">
        {activeTab === "by-client" && (
          <>
            <FilterField label="Cliente">
              <Select
                value={filters.clientId ?? ""}
                onValueChange={(v) => set("clientId", v || undefined)}
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Todos los clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los clientes</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="Local">
              <Select
                value={filters.local ?? ""}
                onValueChange={(v) => set("local", v || undefined)}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Todos los locales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los locales</SelectItem>
                  {locales.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="Encargado">
              <Select
                value={filters.encargadoId ?? ""}
                onValueChange={(v) => set("encargadoId", v || undefined)}
                disabled={filteredEncargados.length === 0}
              >
                <SelectTrigger className="w-56">
                  <SelectValue
                    placeholder={
                      filters.clientId
                        ? "Todos los encargados"
                        : "Selecciona un cliente primero"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los encargados</SelectItem>
                  {filteredEncargados.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="Facturado">
              <Select
                value={filters.facturado ?? "all"}
                onValueChange={(v) =>
                  set("facturado", (v as "all" | "yes" | "no") || "all")
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FACTURADO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="Nº Factura">
              <Input
                value={filters.nroFactura ?? ""}
                onChange={(e) => set("nroFactura", e.target.value || undefined)}
                placeholder="contiene..."
                className="w-40"
              />
            </FilterField>

            <FilterField label="Nº Guía">
              <Input
                value={filters.nroGuia ?? ""}
                onChange={(e) => set("nroGuia", e.target.value || undefined)}
                placeholder="contiene..."
                className="w-40"
              />
            </FilterField>

            <FilterField label="Nº OC">
              <Input
                value={filters.nroOrdenCompra ?? ""}
                onChange={(e) =>
                  set("nroOrdenCompra", e.target.value || undefined)
                }
                placeholder="contiene..."
                className="w-40"
              />
            </FilterField>
          </>
        )}

        {activeTab === "by-workorder" && (
          <>
            <FilterField label="Desde">
              <Input
                type="date"
                value={filters.from?.slice(0, 10) ?? ""}
                onChange={(e) => set("from", e.target.value || undefined)}
                className="w-44"
              />
            </FilterField>

            <FilterField label="Hasta">
              <Input
                type="date"
                value={filters.to?.slice(0, 10) ?? ""}
                onChange={(e) => set("to", e.target.value || undefined)}
                className="w-44"
              />
            </FilterField>

            <FilterField label="Local">
              <Select
                value={filters.local ?? ""}
                onValueChange={(v) => set("local", v || undefined)}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Todos los locales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los locales</SelectItem>
                  {locales.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="Estado">
              <Select
                value={filters.status ?? ""}
                onValueChange={(v) => set("status", v || undefined)}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="Descripción">
              <Input
                value={filters.description ?? ""}
                onChange={(e) =>
                  set("description", e.target.value || undefined)
                }
                placeholder="contiene..."
                className="w-56"
              />
            </FilterField>

            <FilterField label="Nº Factura">
              <Input
                value={filters.nroFactura ?? ""}
                onChange={(e) => set("nroFactura", e.target.value || undefined)}
                placeholder="contiene..."
                className="w-40"
              />
            </FilterField>

            <FilterField label="Nº Guía">
              <Input
                value={filters.nroGuia ?? ""}
                onChange={(e) => set("nroGuia", e.target.value || undefined)}
                placeholder="contiene..."
                className="w-40"
              />
            </FilterField>

            <FilterField label="Nº OT">
              <Input
                value={filters.number ?? ""}
                onChange={(e) => set("number", e.target.value || undefined)}
                placeholder="contiene..."
                className="w-40"
              />
            </FilterField>
          </>
        )}

        <div className="ml-auto">
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Limpiar filtros
          </Button>
        </div>
      </div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}