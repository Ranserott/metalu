"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClientSchema, ClientInput } from "../validations/clientSchemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, User, MapPin, Save, X } from "lucide-react";

type ClientFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ClientInput) => Promise<void>;
  defaultValues?: Partial<ClientInput>;
};

export function ClientForm({ open, onOpenChange, onSubmit, defaultValues }: ClientFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<ClientInput>({
    resolver: zodResolver(ClientSchema) as any,
    defaultValues: defaultValues || { isActive: true, code: "", name: "", contact: "", email: "", phone: "", address: "" },
  });

  async function handleSubmit(data: ClientInput) {
    setSubmitting(true);
    try {
      await onSubmit(data);
      onOpenChange(false);
      form.reset();
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
        <div className="bg-gradient-to-r from-[#2C5282] to-[#3182CE] px-6 py-4 flex items-center justify-between">
          <h2 className="text-white text-lg font-semibold">REGISTRAR CLIENTE</h2>
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
                  <User className="w-4 h-4 text-[#2C5282]" />
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
                        <Button type="button" size="sm" variant="outline" className="border-[#2C5282] text-[#2C5282]">
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
                </div>
              </div>

              {/* Contacto y Ubicación */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#2C5282]" />
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
                      className="w-4 h-4 rounded border-gray-300 text-[#2C5282] focus:ring-[#2C5282]"
                    />
                    <span className="text-sm text-gray-700">Cliente Activo</span>
                  </label>
                </div>
              </div>

              {/* Notas */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <span className="font-semibold text-sm text-gray-700">NOTAS</span>
                </div>
                <div className="p-4">
                  <textarea
                    {...form.register("notes")}
                    placeholder="Notas adicionales..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
                  />
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
              className="bg-gradient-to-r from-[#3182CE] to-[#2C5282] hover:from-[#2C5282] hover:to-[#1a365d] text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {submitting ? "Guardando..." : "Guardar Cliente"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}