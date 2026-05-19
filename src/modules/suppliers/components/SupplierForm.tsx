"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SupplierSchema, SupplierInput } from "../validations/supplierSchemas";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type SupplierFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SupplierInput) => Promise<void>;
  defaultValues?: Partial<SupplierInput>;
};

export function SupplierForm({ open, onOpenChange, onSubmit, defaultValues }: SupplierFormProps) {
  const form = useForm<SupplierInput>({
    resolver: zodResolver(SupplierSchema),
    defaultValues: defaultValues || { isActive: true },
  });

  async function handleSubmit(data: SupplierInput) {
    await onSubmit(data);
    onOpenChange(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Proveedor</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField label="Codigo" {...form.register("code")} error={form.formState.errors.code?.message} />
          <FormField label="Nombre" {...form.register("name")} error={form.formState.errors.name?.message} />
          <FormField label="Contacto" {...form.register("contact")} />
          <FormField label="Email" type="email" {...form.register("email")} error={form.formState.errors.email?.message} />
          <FormField label="Telefono" {...form.register("phone")} />
          <FormField label="Direccion" {...form.register("address")} />
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