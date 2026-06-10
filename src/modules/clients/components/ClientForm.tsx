"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClientSchema, ClientInput } from "../validations/clientSchemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, User, MapPin, FileText, DollarSign, Calendar, Save, X } from "lucide-react";

type ClientFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ClientInput) => Promise<void>;
  defaultValues?: Partial<ClientInput>;
  clientId?: string;
  editMode?: boolean;
};

export function ClientForm({ open, onOpenChange, onSubmit, defaultValues, clientId, editMode }: ClientFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<ClientInput>({
    resolver: zodResolver(ClientSchema) as any,
    defaultValues: defaultValues || {
      isActive: true, code: "", name: "", contact: "", email: "",
      phone: "", address: "", city: "", notes: "", giro: "", oc: "",
      lastPaymentDate: "", currentBalance: 0
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
