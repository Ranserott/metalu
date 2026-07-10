"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SupplierOption } from "../types/report";

type Props = {
  suppliers: SupplierOption[];
  supplierId?: string;
  from?: string;
  to?: string;
  onSupplierChange: (value: string | undefined) => void;
  onFromChange: (value: string | undefined) => void;
  onToChange: (value: string | undefined) => void;
};

export function SupplierReportFilters({
  suppliers,
  supplierId,
  from,
  to,
  onSupplierChange,
  onFromChange,
  onToChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-md border border-t-4 border-t-[var(--theme-primary)] bg-[var(--theme-primary-tint)] p-4 shadow-sm">
      <div className="flex flex-col gap-1 min-w-60">
        <Label className="text-xs">Proveedor</Label>
        <Select
          value={supplierId ?? ""}
          onValueChange={(v) => onSupplierChange(v || undefined)}
        >
          <SelectTrigger className="w-60">
            <SelectValue placeholder="Todos los proveedores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos los proveedores</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs">Desde</Label>
        <Input
          type="date"
          value={from ?? ""}
          onChange={(e) => onFromChange(e.target.value || undefined)}
          className="w-44"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Hasta</Label>
        <Input
          type="date"
          value={to ?? ""}
          onChange={(e) => onToChange(e.target.value || undefined)}
          className="w-44"
        />
      </div>
    </div>
  );
}
