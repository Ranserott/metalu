"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClientSchema, ClientInput } from "../validations/clientSchemas";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ClientFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ClientInput) => Promise<void>;
  defaultValues?: Partial<ClientInput>;
};

export function ClientForm({ open, onOpenChange, onSubmit, defaultValues }: ClientFormProps) {
  const form = useForm<ClientInput>({
    resolver: zodResolver(ClientSchema),
    defaultValues: defaultValues || { isActive: true },
  });

  async function handleSubmit(data: ClientInput) {
    await onSubmit(data);
    onOpenChange(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cliente</DialogTitle>
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