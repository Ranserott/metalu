"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ReportSchema, ReportInput } from "../validations/reportSchemas";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ReportFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ReportInput) => Promise<void>;
  defaultValues?: Partial<ReportInput>;
};

export function ReportForm({ open, onOpenChange, onSubmit, defaultValues }: ReportFormProps) {
  const form = useForm<ReportInput>({
    resolver: zodResolver(ReportSchema),
    defaultValues: defaultValues || {},
  });

  async function handleSubmit(data: ReportInput) {
    await onSubmit(data);
    onOpenChange(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reporte</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField label="Nombre" {...form.register("name")} error={form.formState.errors.name?.message} />
          <FormField label="Tipo" {...form.register("type")} error={form.formState.errors.type?.message} />
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