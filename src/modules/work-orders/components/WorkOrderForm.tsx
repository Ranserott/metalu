"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { WorkOrderSchema, WorkOrderInput } from "../validations/workOrderSchemas";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type WorkOrderFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: WorkOrderInput) => Promise<void>;
  defaultValues?: Partial<WorkOrderInput>;
};

export function WorkOrderForm({ open, onOpenChange, onSubmit, defaultValues }: WorkOrderFormProps) {
  const form = useForm<WorkOrderInput>({
    resolver: zodResolver(WorkOrderSchema),
    defaultValues: defaultValues || { status: "TODO", priority: "MEDIUM" },
  });

  async function handleSubmit(data: WorkOrderInput) {
    await onSubmit(data);
    onOpenChange(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Orden de Trabajo</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField label="Numero" {...form.register("number")} error={form.formState.errors.number?.message} />
          <FormField label="Titulo" {...form.register("title")} error={form.formState.errors.title?.message} />
          <FormField label="Cliente" {...form.register("clientId")} error={form.formState.errors.clientId?.message} />
          <FormField label="Descripcion" {...form.register("description")} />
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