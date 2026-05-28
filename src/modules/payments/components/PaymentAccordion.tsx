"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SupplierDocumentSchema, SupplierDocumentInput, DOCUMENT_TYPES, PAYMENT_STATUSES } from "../validations/paymentSchemas";
import { SupplierModal } from "./SupplierModal";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, Eraser, Save } from "lucide-react";

type SelectedSupplier = { id: string; code: string; name: string } | null;

type Props = {
  onSuccess?: () => void;
  editData?: SupplierDocumentInput & { id: string };
  onEditClear?: () => void;
};

export function PaymentAccordion({ onSuccess, editData, onEditClear }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SelectedSupplier>(null);

  const form = useForm<SupplierDocumentInput>({
    resolver: zodResolver(SupplierDocumentSchema),
    defaultValues: {
      documentDate: new Date(),
      status: "PENDIENTE",
      supplierId: editData?.supplierId ?? "",
      documentType: editData?.documentType,
      documentNumber: editData?.documentNumber ?? "",
      amount: editData?.amount,
      dueDate: editData?.dueDate,
    },
  });

  async function onSubmit(data: SupplierDocumentInput) {
    setSubmitting(true);
    try {
      const url = editData ? `/api/payments/${editData.id}` : "/api/payments";
      const method = editData ? "PUT" : "POST";

      const payload = {
        ...data,
        supplierId: selectedSupplier?.id ?? editData?.supplierId ?? data.supplierId,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Error saving");

      form.reset({ documentDate: new Date(), status: "PENDIENTE" });
      setSelectedSupplier(null);
      onSuccess?.();
      if (editData) onEditClear?.();
    } finally {
      setSubmitting(false);
    }
  }

  function handleSupplierSelect(supplier: { id: string; code: string; name: string }) {
    setSelectedSupplier(supplier);
    form.setValue("supplierId", supplier.id, { shouldValidate: true });
  }

  function handleClean() {
    form.reset({ documentDate: new Date(), status: "PENDIENTE" });
    setSelectedSupplier(null);
    if (editData) onEditClear?.();
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      {/* Header bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-5 py-4 bg-gradient-to-r from-[#2C5282] to-[#3182CE] hover:from-[#1a365d] hover:to-[#2C5282] transition-all text-left"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-white" />
        ) : (
          <ChevronRight className="w-4 h-4 text-white" />
        )}
        <span className="font-semibold text-white text-sm uppercase tracking-wide">
          {editData ? "MODIFICAR DOCUMENTO" : "INGRESAR DOCUMENTO"}
        </span>
      </button>

      {/* Form */}
      {expanded && (
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* RUT Proveedor + Name */}
            <div className="col-span-2 grid grid-cols-3 gap-2 items-end">
              <div className="col-span-2">
                <FormField
                  label="RUT PROVEEDOR"
                  readOnly
                  placeholder="Seleccione un proveedor..."
                  value={selectedSupplier?.code ?? ""}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-[#2C5282] text-[#2C5282] hover:bg-[#2C5282] hover:text-white"
                onClick={() => setSupplierModalOpen(true)}
              >
                ...
              </Button>
            </div>

            {/* Tipo + N° Doc */}
            <div>
              <label className="text-xs font-semibold uppercase text-gray-500 mb-1 block tracking-wide">Tipo Documento</label>
              <Select
                value={form.watch("documentType") ?? ""}
                onValueChange={(v) => form.setValue("documentType", v as SupplierDocumentInput["documentType"])}
              >
                <SelectTrigger className="border-gray-300 focus:border-[#2C5282] focus:ring-[#2C5282]">
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
              label="N° DOCUMENTO"
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
              <label className="text-xs font-semibold uppercase text-gray-500 mb-1 block tracking-wide">Estado</label>
              <Select
                value={form.watch("status") ?? "PENDIENTE"}
                onValueChange={(v) => form.setValue("status", v as SupplierDocumentInput["status"])}
              >
                <SelectTrigger className="border-gray-300 focus:border-[#2C5282] focus:ring-[#2C5282]">
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
              className="bg-gradient-to-r from-[#3182CE] to-[#2C5282] hover:from-[#2C5282] hover:to-[#1a365d] text-white shadow-md"
            >
              <Save className="w-4 h-4 mr-2" />
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