"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer } from "lucide-react";
import type { Quotation } from "../types/quotation";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation: Quotation & { client: { id: string; name: string; code: string } };
};

export function QuotationPrintModal({ open, onOpenChange, quotation }: Props) {
  const [descripcionTrabajo, setDescripcionTrabajo] = useState("");
  const [plazoEntrega, setPlazoEntrega] = useState("");
  const [atencion, setAtencion] = useState("");
  const [area, setArea] = useState("");
  const [cotizoNombre, setCotizoNombre] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setDescripcionTrabajo("");
    setPlazoEntrega("");
    setAtencion("");
    setArea("");
    setCotizoNombre("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleGenerar() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quotations/${quotation.id}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descripcionTrabajo,
          plazoEntrega,
          atencion,
          area,
          cotizoNombre,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Error al generar el PDF (${res.status})`);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Cotizacion-${quotation.number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      handleOpenChange(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error de red";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="wide" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Imprimir Cotización PDF</DialogTitle>
          <DialogDescription>
            Completa los datos para generar el PDF de la cotización {quotation.number}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label className="text-xs font-semibold tracking-wide">DESCRIPCIÓN DEL TRABAJO</Label>
            <Input
              value={descripcionTrabajo}
              onChange={(e) => setDescripcionTrabajo(e.target.value)}
              placeholder="Detalle del trabajo a cotizar"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold tracking-wide">PLAZO DE ENTREGA</Label>
            <Input
              value={plazoEntrega}
              onChange={(e) => setPlazoEntrega(e.target.value)}
              placeholder="Ej: 5 días hábiles"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold tracking-wide">ATENCIÓN</Label>
            <Input
              value={atencion}
              onChange={(e) => setAtencion(e.target.value)}
              placeholder="Persona de contacto"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold tracking-wide">ÁREA</Label>
            <Input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Área solicitante"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold tracking-wide">COTIZÓ</Label>
            <Input
              value={cotizoNombre}
              onChange={(e) => setCotizoNombre(e.target.value)}
              placeholder="Nombre de quien cotiza"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleGenerar}
            disabled={submitting}
            className="bg-[#14679C] hover:bg-[#14679C]/90"
          >
            <Printer className="h-4 w-4 mr-2" />
            {submitting ? "Generando..." : "Generar PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}