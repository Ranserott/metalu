"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Client } from "../types/client";
import { ClientInput } from "../validations/clientSchemas";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientForm } from "./ClientForm";
import { UserPlus } from "lucide-react";

export const columns: ColumnDef<Client>[] = [
  {
    accessorKey: "code",
    header: "Codigo",
  },
  {
    accessorKey: "name",
    header: "Nombre",
  },
  {
    accessorKey: "contact",
    header: "Contacto",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "phone",
    header: "Telefono",
  },
  {
    accessorKey: "isActive",
    header: "Estado",
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "default" : "secondary"}>
        {row.original.isActive ? "Activo" : "Inactivo"}
      </Badge>
    ),
  },
];

export function ClientTable({ data }: { data: Client[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  async function handleCreateClient(data: ClientInput) {
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Error al crear cliente");
    router.refresh();
  }

  return (
    <>
      <div className="flex justify-end">
        <Button
          onClick={() => setModalOpen(true)}
          className="bg-gradient-to-r from-[#3182CE] to-[#2C5282] hover:from-[#2C5282] hover:to-[#1a365d] text-white"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Registrar Cliente
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={data}
        onRowClick={(row) => router.push(`/clients/${row.id}`)}
      />
      <ClientForm
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={handleCreateClient}
      />
    </>
  );
}