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

export type ClientOption = { id: string; name: string };

type Props = {
  clients: ClientOption[];
  clientId?: string;
  from?: string;
  to?: string;
  showDateRange: boolean;
  clientRequired?: boolean;
  onClientChange: (value: string | undefined) => void;
  onFromChange: (value: string | undefined) => void;
  onToChange: (value: string | undefined) => void;
};

export function ReportFilters({
  clients,
  clientId,
  from,
  to,
  showDateRange,
  clientRequired = false,
  onClientChange,
  onFromChange,
  onToChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-md border border-t-4 border-t-[var(--theme-primary)] bg-[var(--theme-primary-tint)] p-4 shadow-sm">
      <div className="flex flex-col gap-1 min-w-60">
        <Label className="text-xs">
          Cliente {clientRequired && <span className="text-red-600">*</span>}
        </Label>
        <Select
          value={clientId ?? ""}
          onValueChange={(v) => onClientChange(v || undefined)}
        >
          <SelectTrigger className="w-60">
            <SelectValue placeholder="Todos los clientes" />
          </SelectTrigger>
          <SelectContent>
            {!clientRequired && (
              <SelectItem value="">Todos los clientes</SelectItem>
            )}
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showDateRange && (
        <>
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
        </>
      )}
    </div>
  );
}