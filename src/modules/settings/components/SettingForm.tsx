"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SettingSchema, SettingInput } from "../validations/settingSchemas";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type SettingFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SettingInput) => Promise<void>;
  defaultValues?: Partial<SettingInput>;
};

export function SettingForm({ open, onOpenChange, onSubmit, defaultValues }: SettingFormProps) {
  const form = useForm<SettingInput>({
    resolver: zodResolver(SettingSchema),
    defaultValues: defaultValues || {},
  });

  async function handleSubmit(data: SettingInput) {
    await onSubmit(data);
    onOpenChange(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configuracion</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField label="Clave" {...form.register("key")} error={form.formState.errors.key?.message} />
          <FormField label="Valor" {...form.register("value")} error={form.formState.errors.value?.message} />
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