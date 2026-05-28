"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CancelDocumentSchema } from "../validations/paymentSchemas";

type CancelModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
};

export function CancelModal({ open, onOpenChange, onConfirm }: CancelModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    const parsed = CancelDocumentSchema.safeParse({ cancellationReason: reason });
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      await onConfirm(reason);
      setReason("");
      setError("");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  function handleClose(open: boolean) {
    if (!open) {
      setReason("");
      setError("");
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar Documento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Motivo de cancelación
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ingrese el motivo..."
              rows={3}
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => handleClose(false)}>
              Volver
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
              {loading ? "Cancelando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
