"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Trash2,
  Search,
  User,
  FileText,
  Wrench,
  Package,
  Calculator,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuotationSchema, QuotationInput } from "../validations/quotationSchemas";
import { ClientModal } from "./ClientModal";

type ItemType = "MATERIAL" | "WORK";

type Item = {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  type: ItemType;
};

type FormValues = Omit<QuotationInput, "subtotal" | "tax" | "total"> & {
  items: Item[];
};

type Props = {
  onSubmit: (data: FormValues) => Promise<void>;
  defaultValues?: Partial<FormValues> & { clientName?: string };
  editMode?: boolean;
};

const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" });

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 border-gray-200",
  SENT: "bg-blue-100 text-blue-800 border-blue-200",
  APPROVED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  SENT: "Enviado",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
};

function SectionHeader({ icon: Icon, title, action }: { icon: any; title: string; action?: React.ReactNode }) {
  return (
    <div className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-dark)] px-4 py-2 flex items-center justify-between rounded-t-lg">
      <div className="flex items-center gap-2 text-white">
        <Icon className="w-4 h-4" />
        <span className="font-semibold text-sm uppercase tracking-wide">{title}</span>
      </div>
      {action}
    </div>
  );
}

function normalizeItems(items: any[] | undefined): Item[] {
  if (!Array.isArray(items)) return [];
  return items.map((it) => ({
    id: it.id,
    description: it.description ?? "",
    quantity: Number(it.quantity) || 0,
    unitPrice: Number(it.unitPrice) || 0,
    type: (it.type === "WORK" ? "WORK" : "MATERIAL") as ItemType,
  }));
}

export function QuotationForm({ onSubmit, defaultValues, editMode }: Props) {
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [selectedClientName, setSelectedClientName] = useState<string>(
    defaultValues?.clientName || ""
  );

  const { register, handleSubmit, control, formState, watch, setValue, reset } =
    useForm<FormValues>({
      resolver: zodResolver(QuotationSchema) as any,
      defaultValues: {
        number: defaultValues?.number || "",
        clientId: defaultValues?.clientId || "",
        status: (defaultValues?.status as any) || "DRAFT",
        validUntil: defaultValues?.validUntil || "",
        notes: defaultValues?.notes || "",
        descripcionTrabajo: defaultValues?.descripcionTrabajo || "",
        plazoEntrega: defaultValues?.plazoEntrega || "",
        atencion: defaultValues?.atencion || "",
        area: defaultValues?.area || "",
        discount: defaultValues?.discount || "0",
        discountType: defaultValues?.discountType || "NONE",
        items: normalizeItems(defaultValues?.items),
      },
    });

  const { fields, append, remove, replace } = useFieldArray({ control, name: "items" });

  useEffect(() => {
    if (defaultValues) {
      const items = normalizeItems(defaultValues.items);
      reset({
        number: defaultValues.number || "",
        clientId: defaultValues.clientId || "",
        status: (defaultValues.status as any) || "DRAFT",
        validUntil: defaultValues.validUntil || "",
        notes: defaultValues.notes || "",
        descripcionTrabajo: defaultValues.descripcionTrabajo || "",
        plazoEntrega: defaultValues.plazoEntrega || "",
        atencion: defaultValues.atencion || "",
        area: defaultValues.area || "",
        discount: defaultValues.discount || "0",
        discountType: defaultValues.discountType || "NONE",
        items,
      });
      replace(items);
      setSelectedClientName(defaultValues.clientName || "");
    }
  }, [defaultValues?.id, reset, replace]);

  const items = watch("items") || [];
  const discountStr = watch("discount") || "0";
  const discountType = watch("discountType") || "NONE";
  const status = watch("status") || "DRAFT";

  const works = items.filter((i) => i.type === "WORK");
  const materials = items.filter((i) => i.type === "MATERIAL");
  const worksTotal = works.reduce(
    (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
    0
  );
  const materialsTotal = materials.reduce(
    (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
    0
  );
  const subtotal = worksTotal + materialsTotal;
  const discountNum = parseFloat(String(discountStr)) || 0;
  const discountValue =
    discountType === "PERCENT" ? (subtotal * discountNum) / 100 : discountNum;
  const taxable = Math.max(0, subtotal - discountValue);
  const tax = taxable * 0.19;
  const total = taxable + tax;

  async function onFormSubmit(values: FormValues) {
    const payload = {
      ...values,
      discount: discountNum.toFixed(2),
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
    } as any;
    await onSubmit(payload);
  }

  function handleSelectClient(client: { id: string; name: string }) {
    setValue("clientId", client.id, { shouldValidate: true });
    setSelectedClientName(client.name);
    setClientModalOpen(false);
  }

  function addItem(type: ItemType) {
    append({ description: "", quantity: 1, unitPrice: 0, type });
  }

  function renderItemRow(field: (typeof fields)[number], idx: number, type: ItemType) {
    const item = items[idx] || { quantity: 0, unitPrice: 0, type };
    const lineTotal =
      (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    return (
      <tr key={field.id} className="border-t hover:bg-blue-50/30 transition-colors">
        <td className="p-2">
          <Input
            {...register(`items.${idx}.description` as const)}
            className="h-9 border-gray-300 focus:border-[var(--theme-primary)]"
            placeholder="Descripción"
          />
        </td>
        <td className="p-2">
          <Input
            type="number"
            step="0.01"
            min="0"
            {...register(`items.${idx}.quantity` as const, {
              valueAsNumber: true,
            })}
            className="h-9 text-right border-gray-300 focus:border-[var(--theme-primary)] w-20"
          />
        </td>
        <td className="p-2">
          <Input
            type="number"
            step="0.01"
            min="0"
            {...register(`items.${idx}.unitPrice` as const, {
              valueAsNumber: true,
            })}
            className="h-9 text-right border-gray-300 focus:border-[var(--theme-primary)] w-28"
          />
        </td>
        <td className="p-2 text-right font-semibold text-gray-700 whitespace-nowrap">
          {clp.format(lineTotal)}
        </td>
        <td className="p-2 w-10">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => remove(idx)}
            className="h-8 w-8 p-0 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
      {/* Header info */}
      <div className="border rounded-lg overflow-hidden shadow-sm">
        <SectionHeader icon={FileText} title="Información General" />
        <div className="grid grid-cols-2 gap-4 p-5 bg-white">
          <div>
            <Label className="text-xs text-gray-500 uppercase tracking-wide">
              Número
            </Label>
            <Input
              {...register("number")}
              readOnly
              className="mt-1 h-10 bg-gray-50 font-bold text-[var(--theme-dark)] border-gray-200"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500 uppercase tracking-wide">
              Cliente
            </Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={selectedClientName}
                readOnly
                placeholder="Seleccionar cliente..."
                className="h-10 bg-gray-50 font-semibold flex-1 border-gray-200"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setClientModalOpen(true)}
                className="h-10 px-3 border-[var(--theme-primary)] text-[var(--theme-primary)] hover:bg-[var(--theme-light)]/30"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
            <input type="hidden" {...register("clientId")} />
            {formState.errors.clientId && (
              <p className="text-xs text-red-500 mt-1">
                {formState.errors.clientId.message as string}
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs text-gray-500 uppercase tracking-wide">
              Estado
            </Label>
            <div className="mt-1 flex items-center gap-2">
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-10 border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Borrador</SelectItem>
                      <SelectItem value="SENT">Enviado</SelectItem>
                      <SelectItem value="APPROVED">Aprobado</SelectItem>
                      <SelectItem value="REJECTED">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <span
                className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold border ${
                  statusColors[status] || ""
                }`}
              >
                {statusLabels[status] || status}
              </span>
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-500 uppercase tracking-wide">
              Válido hasta
            </Label>
            <Input
              type="date"
              {...register("validUntil")}
              className="mt-1 h-10 border-gray-200 font-semibold"
            />
            {formState.errors.validUntil && (
              <p className="text-xs text-red-500 mt-1">
                {formState.errors.validUntil.message as string}
              </p>
            )}
          </div>
          <div className="col-span-2">
            <Label className="text-xs text-gray-500 uppercase tracking-wide">
              Descripción
            </Label>
            <Textarea
              {...register("notes")}
              rows={2}
              className="mt-1 border-gray-200 resize-none"
              placeholder="Notas o descripción de la cotización..."
            />
          </div>
        </div>
      </div>

      {/* Datos para Cotización (se imprimen en el PDF) */}
      <div className="border rounded-lg overflow-hidden shadow-sm">
        <SectionHeader icon={FileText} title="Datos para Cotización" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-white">
          <div className="md:col-span-2">
            <Label className="text-xs text-gray-500 uppercase tracking-wide">
              Descripción del Trabajo
            </Label>
            <Textarea
              {...register("descripcionTrabajo")}
              rows={2}
              className="mt-1 border-gray-200 resize-none"
              placeholder="Ej: MESON SALIDA DETECTOR METALES"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500 uppercase tracking-wide">
              Plazo de Entrega
            </Label>
            <Input
              {...register("plazoEntrega")}
              className="mt-1 h-10 border-gray-200"
              placeholder="Ej: 15 Dias"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500 uppercase tracking-wide">
              Atención
            </Label>
            <Input
              {...register("atencion")}
              className="mt-1 h-10 border-gray-200"
              placeholder="Persona de contacto en el cliente"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-500 uppercase tracking-wide">
              Área
            </Label>
            <Input
              {...register("area")}
              className="mt-1 h-10 border-gray-200"
              placeholder="Departamento o área del cliente"
            />
          </div>
        </div>
      </div>

      {/* Works */}
      <div className="border rounded-lg overflow-hidden shadow-sm">
        <SectionHeader
          icon={Wrench}
          title="I. Detalle de Trabajos Realizados"
          action={
            <Button
              type="button"
              size="sm"
              onClick={() => addItem("WORK")}
              className="h-7 bg-white/20 hover:bg-white/30 text-white border-0"
            >
              <Plus className="w-3 h-3 mr-1" /> Trabajo
            </Button>
          }
        />
        <div className="bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-2.5 font-semibold text-gray-600">Descripción</th>
                <th className="text-right p-2.5 font-semibold text-gray-600 w-24">Cant.</th>
                <th className="text-right p-2.5 font-semibold text-gray-600 w-32">P. Unit.</th>
                <th className="text-right p-2.5 font-semibold text-gray-600 w-36">Total</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {works.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-gray-400 py-8">
                    <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Sin trabajos. Agregá uno con el botón de arriba.
                  </td>
                </tr>
              ) : (
                fields
                  .map((field, idx) => ({ field, idx }))
                  .filter(({ idx }) => items[idx]?.type === "WORK")
                  .map(({ field, idx }) => renderItemRow(field, idx, "WORK"))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Materials */}
      <div className="border rounded-lg overflow-hidden shadow-sm">
        <SectionHeader
          icon={Package}
          title="II. Detalle de Materiales"
          action={
            <Button
              type="button"
              size="sm"
              onClick={() => addItem("MATERIAL")}
              className="h-7 bg-white/20 hover:bg-white/30 text-white border-0"
            >
              <Plus className="w-3 h-3 mr-1" /> Material
            </Button>
          }
        />
        <div className="bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-2.5 font-semibold text-gray-600">Descripción</th>
                <th className="text-right p-2.5 font-semibold text-gray-600 w-24">Cant.</th>
                <th className="text-right p-2.5 font-semibold text-gray-600 w-32">P. Unit.</th>
                <th className="text-right p-2.5 font-semibold text-gray-600 w-36">Total</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {materials.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-gray-400 py-8">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Sin materiales. Agregá uno con el botón de arriba.
                  </td>
                </tr>
              ) : (
                fields
                  .map((field, idx) => ({ field, idx }))
                  .filter(({ idx }) => items[idx]?.type === "MATERIAL")
                  .map(({ field, idx }) => renderItemRow(field, idx, "MATERIAL"))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="border rounded-lg overflow-hidden shadow-sm">
        <SectionHeader icon={Calculator} title="Resumen de Totales" />
        <div className="p-5 bg-white space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Materiales:</span>
            <span className="font-semibold text-gray-800">{clp.format(materialsTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Trabajos:</span>
            <span className="font-semibold text-gray-800">{clp.format(worksTotal)}</span>
          </div>
          <div className="flex justify-between text-sm border-t pt-2.5">
            <span className="text-gray-600 font-medium">Subtotal:</span>
            <span className="font-semibold text-gray-800">{clp.format(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm gap-2">
            <span className="text-gray-600 shrink-0">Descuento:</span>
            <div className="flex items-center gap-2">
              <Controller
                name="discountType"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || "NONE"}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="h-9 w-40 border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Sin descuento</SelectItem>
                      <SelectItem value="AMOUNT">Monto ($)</SelectItem>
                      <SelectItem value="PERCENT">Porcentaje (%)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {discountType !== "NONE" && (
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("discount")}
                  className="h-9 w-24 text-right border-gray-300"
                />
              )}
            </div>
          </div>
          {discountType !== "NONE" && discountNum > 0 && (
            <div className="flex justify-between text-sm text-red-600 bg-red-50 -mx-5 px-5 py-1.5 border-y border-red-100">
              <span className="font-medium">
                Descuento aplicado
                {discountType === "PERCENT" ? ` (${discountNum}%)` : ""}:
              </span>
              <span className="font-semibold">-{clp.format(discountValue)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm border-t pt-2.5">
            <span className="text-gray-600 font-medium">Subtotal Afecto:</span>
            <span className="font-semibold text-gray-800">{clp.format(taxable)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">IVA (19%):</span>
            <span className="font-semibold text-gray-800">{clp.format(tax)}</span>
          </div>
          <div className="flex justify-between items-center text-lg font-bold border-t pt-3 mt-1">
            <span className="text-gray-800">Total:</span>
            <span className="text-[var(--theme-dark)] bg-[var(--theme-light)]/40 px-3 py-1 rounded">
              {clp.format(total)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-white -mx-6 px-6 py-3 border-t">
        <Button
          type="submit"
          disabled={formState.isSubmitting}
          className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-dark)] shadow-md hover:shadow-lg transition-shadow"
        >
          <Save className="w-4 h-4 mr-2" />
          {editMode ? "Actualizar cotización" : "Crear cotización"}
        </Button>
      </div>

      <ClientModal
        open={clientModalOpen}
        onOpenChange={setClientModalOpen}
        onSelect={handleSelectClient}
      />
    </form>
  );
}
