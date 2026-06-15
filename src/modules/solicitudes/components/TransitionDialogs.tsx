"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type BaseProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason?: string) => Promise<void>;
};

export function RejectDialog({ open, onOpenChange, onConfirm }: BaseProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await onConfirm(reason);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rechazar solicitud</DialogTitle>
          <DialogDescription>
            Indica el motivo del rechazo. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-xs font-semibold tracking-wide">MOTIVO</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explica por qué se rechaza esta solicitud..."
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={submitting || !reason.trim()}>
            {submitting ? "Rechazando..." : "Rechazar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CancelDialog({ open, onOpenChange, onConfirm }: BaseProps) {
  const [submitting, setSubmitting] = useState(false);
  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar solicitud</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que querés cancelar esta solicitud? Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            No, volver
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Cancelando..." : "Sí, cancelar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ApproveProps = BaseProps & {
  summary: { supplierName: string; total: number; itemCount: number };
};

export function ApproveDialog({ open, onOpenChange, onConfirm, summary }: ApproveProps) {
  const [submitting, setSubmitting] = useState(false);
  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aprobar y emitir orden de compra</DialogTitle>
          <DialogDescription>
            Se creará una nueva Purchase Order en estado SENT con los siguientes datos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Proveedor:</span>
            <span className="font-semibold">{summary.supplierName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Items:</span>
            <span className="font-semibold">{summary.itemCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-semibold">
              {summary.total.toLocaleString("es-CL", { style: "currency", currency: "CLP" })}
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={submitting} className="bg-green-600 hover:bg-green-700">
            {submitting ? "Aprobando..." : "Aprobar y Emitir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
