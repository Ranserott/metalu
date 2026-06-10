"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

type Client = {
  id: string;
  name: string;
  rut?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (client: Client) => void;
};

export function ClientModal({ open, onOpenChange, onSelect }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      fetch("/api/clients?activeOnly=true")
        .then((res) => res.json())
        .then((data) => setClients(data))
        .catch(console.error);
    }
  }, [open]);

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.rut && c.rut.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[var(--theme-dark)]">Seleccionar Cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre o RUT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {filtered.map((client) => (
              <button
                key={client.id}
                onClick={() => {
                  onSelect(client);
                  onOpenChange(false);
                }}
                className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <p className="font-medium text-gray-900">{client.name}</p>
                {client.rut && <p className="text-sm text-gray-500">{client.rut}</p>}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-gray-500 py-4">No se encontraron clientes</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
