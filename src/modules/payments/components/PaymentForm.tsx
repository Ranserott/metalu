"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PaymentSchema, PaymentInput } from "../validations/paymentSchemas";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type PaymentFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PaymentInput) => Promise<void>;
  defaultValues?: Partial<PaymentInput>;
};

export function PaymentForm({ open, onOpenChange, onSubmit, defaultValues }: PaymentFormProps) {
  const form = useForm<PaymentInput>({
    resolver: zodResolver(PaymentSchema),
    defaultValues: defaultValues || { method: "CASH" },
  });

  async function handleSubmit(data: PaymentInput) {
    await onSubmit(data);
    onOpenChange(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pago</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField label="Numero" {...form.register("number")} error={form.formState.errors.number?.message} />
          <FormField label="Factura" {...form.register("invoiceId")} error={form.formState.errors.invoiceId?.message} />
          <FormField label="Monto" type="number" {...form.register("amount")} error={form.formState.errors.amount?.message} />
          <FormField label="Referencia" {...form.register("reference")} />
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