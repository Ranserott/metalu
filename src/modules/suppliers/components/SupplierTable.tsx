"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Supplier } from "../types/supplier";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { DeleteSupplierModal } from "./DeleteSupplierModal";

type Props = {
  data: Supplier[];
  onEdit: (supplier: Supplier) => void;
  onDeleteSuccess: () => void;
};

const statusColors: Record<string, string> = {
  Activo: "bg-green-100 text-green-800",
  Inactivo: "bg-gray-100 text-gray-800",
};

export function SupplierTable({ data, onEdit, onDeleteSuccess }: Props) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const columns: ColumnDef<Supplier>[] = [
    {
      accessorKey: "code",
      header: "Código",
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
      accessorKey: "ciudad",
      header: "Ciudad",
    },
    {
      accessorKey: "phone",
      header: "Teléfono",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "isActive",
      header: "Estado",
      cell: ({ row }) => (
        <Badge className={statusColors[row.original.isActive ? "Activo" : "Inactivo"]}>
          {row.original.isActive ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(row.original)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelectedSupplier(row.original);
              setDeleteModalOpen(true);
            }}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  async function handleDelete() {
    if (!selectedSupplier) return;
    const res = await fetch(`/api/suppliers/${selectedSupplier.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      onDeleteSuccess();
    }
  }

  return (
    <>
      <DataTable columns={columns} data={data} />
      <DeleteSupplierModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleDelete}
        supplierName={selectedSupplier?.name ?? ""}
      />
    </>
  );
}
