"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SupplierDocumentSchema, SupplierDocumentInput, DOCUMENT_TYPES, PAYMENT_STATUSES } from "../validations/paymentSchemas";
import { SupplierModal } from "./SupplierModal";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, Eraser, Save } from "lucide-react";

type Props = {
  onSuccess?: () => void;
  editData?: SupplierDocumentInput & { id: string };
  onEditClear?: () => void;
};

export function PaymentAccordion({ onSuccess, editData, onEditClear }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<SupplierDocumentInput>({
    resolver: zodResolver(SupplierDocumentSchema),
    defaultValues: {
      documentDate: new Date(),
      status: "PENDIENTE",
      ...editData,
    },
  });

  const selectedSupplier = form.watch("supplierId");

  async function onSubmit(data: SupplierDocumentInput) {
    setSubmitting(true);
    try {
      const url = editData ? `/api/payments/${editData.id}` : "/api/payments";
      const method = editData ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Error saving");

      form.reset({
        documentDate: new Date(),
        status: "PENDIENTE",
      });
      onSuccess?.();
      if (editData) onEditClear?.();
    } finally {
      setSubmitting(false);
    }
  }

  function handleSupplierSelect(supplier: { id: string; code: string; name: string }) {
    form.setValue("supplierId", supplier.id);
  }

  function handleClean() {
    form.reset({ documentDate: new Date(), status: "PENDIENTE" });
    if (editData) onEditClear?.();
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <span className="font-medium">
          {editData ? "MODIFICAR DOCUMENTO" : "INGRESAR DOCUMENTO"}
        </span>
      </button>

      {/* Form */}
      {expanded && (
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* RUT + Name */}
            <div className="col-span-2 grid grid-cols-3 gap-2 items-end">
              <div className="col-span-2">
                <FormField
                  label="RUT Proveedor"
                  {...form.register("supplierId")}
                  error={form.formState.errors.supplierId?.message}
                  readOnly
                  placeholder="Seleccione un proveedor..."
                  value={selectedSupplier || ""}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSupplierModalOpen(true)}
              >
                ...
              </Button>
            </div>

            {/* Tipo + N° Doc */}
            <div>
              <label className="text-sm font-medium mb-1 block">Tipo Documento</label>
              <Select
                value={form.watch("documentType")}
                onValueChange={(v) => form.setValue("documentType", v as SupplierDocumentInput["documentType"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione..." />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.documentType && (
                <p className="text-red-500 text-xs mt-1">
                  {form.formState.errors.documentType.message}
                </p>
              )}
            </div>

            <FormField
              label="N° Documento"
              {...form.register("documentNumber")}
              error={form.formState.errors.documentNumber?.message}
            />

            {/* Fecha Doc + Valor */}
            <FormField
              label="Fecha Documento"
              type="date"
              {...form.register("documentDate", { valueAsDate: true })}
              error={form.formState.errors.documentDate?.message}
            />

            <FormField
              label="Valor"
              type="number"
              step="0.01"
              {...form.register("amount", { valueAsNumber: true })}
              error={form.formState.errors.amount?.message}
            />

            {/* Fecha Venc + Estado */}
            <FormField
              label="Fecha Vencimiento"
              type="date"
              {...form.register("dueDate", { valueAsDate: true })}
              error={form.formState.errors.dueDate?.message}
            />

            <div>
              <label className="text-sm font-medium mb-1 block">Estado</label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) => form.setValue("status", v as SupplierDocumentInput["status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={handleClean}>
              <Eraser className="w-4 h-4 mr-1" />
              LIMPIAR
            </Button>
            <Button type="submit" disabled={submitting}>
              <Save className="w-4 h-4 mr-1" />
              {submitting ? "GRABANDO..." : "GRABAR"}
            </Button>
          </div>
        </form>
      )}

      <SupplierModal
        open={supplierModalOpen}
        onOpenChange={setSupplierModalOpen}
        onSelect={handleSupplierSelect}
      />
    </div>
  );
}