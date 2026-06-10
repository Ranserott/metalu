"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

type Quotation = {
  id: string;
  number: string;
  client?: { id: string; name: string } | null;
  createdAt: string | Date;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (quotation: Quotation) => void;
};

const formatDate = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("es-CL");
};

export function QuotationModal({ open, onOpenChange, onSelect }: Props) {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      fetch("/api/quotations")
        .then((res) => res.json())
        .then((data) => setQuotations(Array.isArray(data) ? data : []))
        .catch(console.error);
    }
  }, [open]);

  const filtered = quotations.filter((q) => {
    const term = search.toLowerCase();
    return (
      q.number.toLowerCase().includes(term) ||
      (q.client?.name || "").toLowerCase().includes(term)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[var(--theme-dark)]">
            Seleccionar Cotización
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por código o cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filtered.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                {quotations.length === 0
                  ? "No hay cotizaciones disponibles"
                  : "No se encontraron cotizaciones"}
              </p>
            ) : (
              filtered.map((q) => (
                <button
                  key={q.id}
                  onClick={() => {
                    onSelect(q);
                    onOpenChange(false);
                  }}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-[var(--theme-primary)] hover:bg-blue-50/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[var(--theme-dark)]">
                        {q.number}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {q.client?.name || "(sin cliente)"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-500 uppercase">Creado</p>
                      <p className="text-sm font-medium text-gray-700">
                        {formatDate(q.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
