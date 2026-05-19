"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PurchaseSchema, PurchaseInput } from "../validations/purchaseSchemas";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type PurchaseFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PurchaseInput) => Promise<void>;
  defaultValues?: Partial<PurchaseInput>;
};

export function PurchaseForm({ open, onOpenChange, onSubmit, defaultValues }: PurchaseFormProps) {
  const form = useForm<PurchaseInput>({
    resolver: zodResolver(PurchaseSchema),
    defaultValues: defaultValues || { status: "DRAFT" },
  });

  async function handleSubmit(data: PurchaseInput) {
    await onSubmit(data);
    onOpenChange(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Orden de Compra</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField label="Numero" {...form.register("number")} error={form.formState.errors.number?.message} />
          <FormField label="Proveedor" {...form.register("supplierId")} error={form.formState.errors.supplierId?.message} />
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