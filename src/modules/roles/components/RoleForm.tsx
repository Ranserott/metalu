"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RoleSchema, RoleInput } from "../validations/roleSchemas";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type RoleFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: RoleInput) => Promise<void>;
  defaultValues?: Partial<RoleInput>;
};

export function RoleForm({ open, onOpenChange, onSubmit, defaultValues }: RoleFormProps) {
  const form = useForm<RoleInput>({
    resolver: zodResolver(RoleSchema),
    defaultValues: defaultValues || {},
  });

  async function handleSubmit(data: RoleInput) {
    await onSubmit(data);
    onOpenChange(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rol</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField label="Nombre" {...form.register("name")} error={form.formState.errors.name?.message} />
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