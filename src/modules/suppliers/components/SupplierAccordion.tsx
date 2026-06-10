"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SupplierSchema, SupplierInput } from "../validations/supplierSchemas";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Eraser, Save } from "lucide-react";

type Props = {
  onSuccess?: () => void;
  editData?: SupplierInput & { id: string };
  onEditClear?: () => void;
};

export function SupplierAccordion({ onSuccess, editData, onEditClear }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const accordionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editData) {
      setExpanded(true);
      setTimeout(() => {
        accordionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [editData]);

  const form = useForm<SupplierInput>({
    resolver: zodResolver(SupplierSchema),
    defaultValues: editData || { isActive: true },
  });

  async function onSubmit(data: SupplierInput) {
    setSubmitting(true);
    try {
      const url = editData ? `/api/suppliers/${editData.id}` : "/api/suppliers";
      const method = editData ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Supplier save error:", errorData);
        throw new Error("Error saving: " + JSON.stringify(errorData));
      }

      form.reset({ name: "", contact: "", email: "", phone: "", address: "", ciudad: "", isActive: true });
      onSuccess?.();
      if (editData) onEditClear?.();
    } finally {
      setSubmitting(false);
    }
  }

  function handleClean() {
    form.reset({ name: "", contact: "", email: "", phone: "", address: "", ciudad: "", isActive: true });
    if (editData) onEditClear?.();
  }

  return (
    <div ref={accordionRef} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      {/* Header bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-5 py-4 bg-gradient-to-r from-[var(--theme-dark)] to-[var(--theme-primary)] hover:from-[var(--theme-darker)] hover:to-[var(--theme-dark)] transition-all text-left"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-white" />
        ) : (
          <ChevronRight className="w-4 h-4 text-white" />
        )}
        <span className="font-semibold text-white text-sm uppercase tracking-wide">
          {editData ? "MODIFICAR PROVEEDOR" : "INGRESAR PROVEEDOR"}
        </span>
      </button>

      {/* Form */}
      {expanded && (
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="NOMBRE"
              {...form.register("name")}
              error={form.formState.errors.name?.message}
              placeholder="Nombre del proveedor"
            />

            <FormField
              label="CONTACTO"
              {...form.register("contact")}
              placeholder="Persona de contacto"
            />

            <FormField
              label="DIRECCIÓN"
              {...form.register("address")}
              placeholder="Dirección"
            />

            <FormField
              label="CIUDAD"
              {...form.register("ciudad")}
              placeholder="Ciudad"
            />

            <FormField
              label="TELÉFONO"
              {...form.register("phone")}
              placeholder="Teléfono"
            />

            <FormField
              label="EMAIL"
              type="email"
              {...form.register("email")}
              error={form.formState.errors.email?.message}
              placeholder="email@ejemplo.com"
            />

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="isActive"
                {...form.register("isActive")}
                className="w-4 h-4 text-[var(--theme-dark)] border-gray-300 rounded focus:ring-[var(--theme-dark)]"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Proveedor activo
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              className="border-gray-300 text-gray-600 hover:bg-gray-50"
              onClick={handleClean}
            >
              <Eraser className="w-4 h-4 mr-2" />
              LIMPIAR
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-dark)] hover:from-[var(--theme-dark)] hover:to-[var(--theme-darker)] text-white shadow-md"
            >
              <Save className="w-4 h-4 mr-2" />
              {submitting ? "GRABANDO..." : "GRABAR"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}