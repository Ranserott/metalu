"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClientSchema, ClientInput } from "../validations/clientSchemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, User, MapPin, FileText, DollarSign, Calendar, Save, X, ChevronDown, Check } from "lucide-react";

type ParentClientOption = {
  id: string;
  code: string;
  name: string;
};

type ClientFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ClientInput) => Promise<void>;
  defaultValues?: Partial<ClientInput>;
  clientId?: string;
  editMode?: boolean;
  parentOptions: ParentClientOption[];
  onSaved?: () => void;
};

export function ClientForm({ open, onOpenChange, onSubmit, defaultValues, clientId, editMode, parentOptions, onSaved }: ClientFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<ClientInput>({
    resolver: zodResolver(ClientSchema) as any,
    defaultValues: defaultValues || {
      isActive: true, code: "", name: "", contact: "", email: "",
      phone: "", address: "", city: "", notes: "", giro: "", oc: "",
      lastPaymentDate: "", currentBalance: 0, parentClientId: null
    },
  });

  useEffect(() => {
    if (defaultValues?.code) {
      form.reset(defaultValues);
    }
  }, [defaultValues?.code, form]);

  async function handleSubmit(data: ClientInput) {
    setSubmitting(true);
    try {
      if (editMode && clientId) {
        const res = await fetch(`/api/clients/${clientId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Error al actualizar el cliente");
        onSaved?.();
      } else {
        await onSubmit(data);
      }
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      alert(error.message || "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${open ? "visible" : "invisible"}`}
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}
    >
      <div className="bg-white rounded-xl shadow-2xl w-[900px] max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[var(--theme-dark)] to-[var(--theme-primary)] px-6 py-4 flex items-center justify-between">
          <h2 className="text-white text-lg font-semibold">{editMode ? "EDITAR CLIENTE" : "REGISTRAR CLIENTE"}</h2>
          <button onClick={() => onOpenChange(false)} className="text-white hover:bg-white/20 rounded p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={form.handleSubmit(handleSubmit)} className="p-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Left Column - 2/3 */}
            <div className="col-span-2 space-y-6">
              {/* Datos Identificatorios */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
                  <User className="w-4 h-4 text-[var(--theme-dark)]" />
                  <span className="font-semibold text-sm text-gray-700">DATOS IDENTIFICATORIOS</span>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-3">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">RUT Cliente</label>
                      <div className="flex gap-1">
                        <Input
                          {...form.register("code")}
                          placeholder="12.345.678-9"
                          className="flex-1 text-sm"
                        />
                        <Button type="button" size="sm" variant="outline" className="border-[var(--theme-dark)] text-[var(--theme-dark)]">
                          <Search className="w-4 h-4" />
                        </Button>
                      </div>
                      {form.formState.errors.code && (
                        <p className="text-xs text-red-500 mt-1">{form.formState.errors.code.message}</p>
                      )}
                    </div>
                    <div className="col-span-9">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Nombre / Razón Social</label>
                      <Input
                        {...form.register("name")}
                        placeholder="Nombre completo o razón social"
                        className="text-sm"
                      />
                      {form.formState.errors.name && (
                        <p className="text-xs text-red-500 mt-1">{form.formState.errors.name.message}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Giro</label>
                    <Input
                      {...form.register("giro")}
                      placeholder="Actividad o rubro del cliente"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Empresa padre (opcional)</label>
                    <Controller
                      name="parentClientId"
                      control={form.control}
                      render={({ field }) => (
                        <ParentClientPicker
                          value={field.value ?? null}
                          onChange={(id) => field.onChange(id)}
                          options={parentOptions}
                          excludeId={clientId}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Contacto y Ubicación */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[var(--theme-dark)]" />
                  <span className="font-semibold text-sm text-gray-700">CONTACTO Y UBICACIÓN</span>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Dirección</label>
                    <Input
                      {...form.register("address")}
                      placeholder="Dirección completa"
                      className="text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Ciudad</label>
                      <Input
                        {...form.register("city")}
                        placeholder="Ciudad"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Correo Electrónico</label>
                      <Input
                        type="email"
                        {...form.register("email")}
                        placeholder="email@ejemplo.cl"
                        className="text-sm"
                      />
                      {form.formState.errors.email && (
                        <p className="text-xs text-red-500 mt-1">{form.formState.errors.email.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Teléfono</label>
                      <Input
                        {...form.register("phone")}
                        placeholder="+56 9 1234 5678"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Celular</label>
                      <Input
                        {...form.register("contact")}
                        placeholder="+56 9 1234 5678"
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - 1/3 */}
            <div className="space-y-6">
              {/* Estado Financiero */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--theme-dark)]" />
                  <span className="font-semibold text-sm text-gray-700">ESTADO FINANCIERO</span>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">O.C.</label>
                    <Input
                      {...form.register("oc")}
                      placeholder="Orden de Compra"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Fecha Último Pago</label>
                    <Input
                      type="date"
                      {...form.register("lastPaymentDate")}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Saldo Actual (CLP)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <Input
                        type="number"
                        step="1"
                        {...form.register("currentBalance", { valueAsNumber: true })}
                        placeholder="0"
                        className="pl-7 text-sm text-right"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Estado del Cliente */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <span className="font-semibold text-sm text-gray-700">ESTADO</span>
                </div>
                <div className="p-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      {...form.register("isActive")}
                      defaultChecked={defaultValues?.isActive ?? true}
                      className="w-4 h-4 rounded border-gray-300 text-[var(--theme-dark)] focus:ring-[var(--theme-dark)]"
                    />
                    <span className="text-sm text-gray-700">Cliente Activo</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
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
              {submitting ? (editMode ? "Guardando..." : "Guardando...") : (editMode ? "Guardar Cambios" : "Guardar Cliente")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ParentClientPicker({
  value,
  onChange,
  options,
  excludeId,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  options: ParentClientOption[];
  excludeId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = options.find((o) => o.id === value) ?? null;
  const q = search.trim().toLowerCase();
  const filtered = options.filter((o) => {
    if (o.id === excludeId) return false;
    if (!q) return true;
    return (
      o.name.toLowerCase().includes(q) ||
      o.code.toLowerCase().includes(q)
    );
  });

  function pick(id: string | null) {
    onChange(id);
    setOpen(false);
    setSearch("");
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }}>
      <PopoverTrigger
        className="w-full flex items-center justify-between text-sm border border-input bg-transparent rounded-md px-3 py-2 hover:bg-accent/30 transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--theme-dark)]"
      >
        <span className={selected ? "text-gray-800 truncate text-left" : "text-gray-400 truncate text-left"}>
          {selected ? `${selected.name} — ${selected.code}` : "Sin empresa padre"}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
      </PopoverTrigger>
      <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o RUT..."
              className="pl-7 h-8 text-sm border-0 focus-visible:ring-0 shadow-none"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          <button
            type="button"
            onClick={() => pick(null)}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center justify-between"
          >
            <span className="text-gray-500 italic">Sin empresa padre</span>
            {value === null && <Check className="h-4 w-4 text-[var(--theme-dark)]" />}
          </button>
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-4">Sin resultados</p>
          ) : (
            filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => pick(o.id)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-800 truncate">{o.name}</div>
                    <div className="text-xs text-gray-500">{o.code}</div>
                  </div>
                  {value === o.id && <Check className="h-4 w-4 text-[var(--theme-dark)] shrink-0" />}
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
