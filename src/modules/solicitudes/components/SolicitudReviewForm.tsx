"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import { SolicitudItemsTable, DraftItem } from "./SolicitudItemsTable";

type SupplierOpt = { id: string; name: string };
type ExistingItem = { id?: string; description: string; quantity: number; unitPrice: number };

const TAX_RATE = 0.19;

export function SolicitudReviewForm({
  solicitudId,
  initialSupplierId,
  initialItems,
  initialDiscount,
  initialDiscountType,
}: {
  solicitudId: string;
  initialSupplierId: string | null;
  initialItems: ExistingItem[];
  initialDiscount: number | null;
  initialDiscountType: "NONE" | "AMOUNT" | "PERCENT" | null;
}) {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<SupplierOpt[]>([]);
  const [supplierId, setSupplierId] = useState(initialSupplierId ?? "");
  const [items, setItems] = useState<DraftItem[]>(
    initialItems.length > 0
      ? initialItems.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        }))
      : [{ description: "", quantity: 1, unitPrice: 0 }]
  );
  const [discount, setDiscount] = useState<number>(initialDiscount ?? 0);
  const [discountType, setDiscountType] = useState<"NONE" | "AMOUNT" | "PERCENT">(
    initialDiscountType ?? "NONE"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/suppliers?activeOnly=true")
      .then((r) => r.json())
      .then((d) => setSuppliers(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  let discountAmount = 0;
  if (discountType === "AMOUNT") discountAmount = discount;
  else if (discountType === "PERCENT") discountAmount = subtotal * (discount / 100);
  const taxable = Math.max(0, subtotal - discountAmount);
  const tax = taxable * TAX_RATE;
  const total = taxable + tax;

  async function handleSave() {
    setError(null);
    if (!supplierId) {
      setError("Selecciona un proveedor");
      return;
    }
    if (items.length === 0 || items.some((it) => !it.description)) {
      setError("Todos los items requieren descripción");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/solicitudes/${solicitudId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, items, discount, discountType }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al guardar la revisión");
        return;
      }
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? "Error de red");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-lg font-semibold">Revisión de Gerencia</h2>
      <hr />

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2 max-w-md">
        <Label className="text-xs font-semibold tracking-wide">PROVEEDOR</Label>
        <Select value={supplierId} onValueChange={(v) => v && setSupplierId(v)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un proveedor" />
          </SelectTrigger>
          <SelectContent>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold tracking-wide">ITEMS</Label>
        <SolicitudItemsTable items={items} onChange={setItems} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold tracking-wide">DESCUENTO</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold tracking-wide">TIPO DESCUENTO</Label>
          <Select value={discountType} onValueChange={(v) => v && setDiscountType(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">Ninguno</SelectItem>
              <SelectItem value="AMOUNT">Monto</SelectItem>
              <SelectItem value="PERCENT">Porcentaje</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold tracking-wide">SUBTOTAL</Label>
          <div className="h-10 px-3 py-2 border rounded-md bg-muted text-sm font-mono">
            {subtotal.toLocaleString("es-CL", { style: "currency", currency: "CLP" })}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold tracking-wide">TOTAL</Label>
          <div className="h-10 px-3 py-2 border rounded-md bg-muted text-sm font-mono font-semibold">
            {total.toLocaleString("es-CL", { style: "currency", currency: "CLP" })}
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        IVA (19%): {tax.toLocaleString("es-CL", { style: "currency", currency: "CLP" })}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={submitting}>
          <Save className="h-4 w-4 mr-2" />
          {submitting ? "Guardando..." : "Guardar revisión"}
        </Button>
      </div>
    </Card>
  );
}
