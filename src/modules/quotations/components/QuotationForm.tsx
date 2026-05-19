"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { QuotationSchema, QuotationInput } from "../validations/quotationSchemas";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type QuotationFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: QuotationInput) => Promise<void>;
  defaultValues?: Partial<QuotationInput>;
};

export function QuotationForm({ open, onOpenChange, onSubmit, defaultValues }: QuotationFormProps) {
  const form = useForm<QuotationInput>({
    resolver: zodResolver(QuotationSchema),
    defaultValues: defaultValues || { status: "DRAFT" },
  });

  async function handleSubmit(data: QuotationInput) {
    await onSubmit(data);
    onOpenChange(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cotizacion</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField label="Numero" {...form.register("number")} error={form.formState.errors.number?.message} />
          <FormField label="Cliente" {...form.register("clientId")} error={form.formState.errors.clientId?.message} />
          <FormField label="Notas" {...form.register("notes")} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}