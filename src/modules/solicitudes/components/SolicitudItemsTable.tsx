"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

export type DraftItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export function SolicitudItemsTable({
  items,
  onChange,
  readOnly = false,
}: {
  items: DraftItem[];
  onChange: (next: DraftItem[]) => void;
  readOnly?: boolean;
}) {
  function update(index: number, patch: Partial<DraftItem>) {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }
  function add() {
    onChange([...items, { description: "", quantity: 1, unitPrice: 0 }]);
  }
  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-1">
        <div className="col-span-6">Descripción</div>
        <div className="col-span-2 text-right">Cantidad</div>
        <div className="col-span-2 text-right">Precio Unit.</div>
        <div className="col-span-1 text-right">Total</div>
        <div className="col-span-1" />
      </div>
      {items.map((it, i) => {
        const total = it.quantity * it.unitPrice;
        return (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <Input
              className="col-span-6"
              value={it.description}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder="Descripción del item"
              readOnly={readOnly}
            />
            <Input
              className="col-span-2 text-right"
              type="number"
              step="0.01"
              min="0"
              value={it.quantity}
              onChange={(e) => update(i, { quantity: Number(e.target.value) })}
              readOnly={readOnly}
            />
            <Input
              className="col-span-2 text-right"
              type="number"
              step="0.01"
              min="0"
              value={it.unitPrice}
              onChange={(e) => update(i, { unitPrice: Number(e.target.value) })}
              readOnly={readOnly}
            />
            <div className="col-span-1 text-right text-sm font-mono">
              {total.toLocaleString("es-CL", { style: "currency", currency: "CLP" })}
            </div>
            <div className="col-span-1 text-right">
              {!readOnly && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => remove(i)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
      {!readOnly && (
        <Button type="button" variant="outline" size="sm" onClick={add} className="mt-2">
          <Plus className="h-4 w-4 mr-1" />
          Agregar item
        </Button>
      )}
    </div>
  );
}
