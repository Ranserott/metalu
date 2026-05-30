"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, X } from "lucide-react";
import { CancelModal } from "./CancelModal";

type SupplierDocumentRow = {
  id: string;
  number: string;
  supplier: { id: string; code: string; name: string } | null;
  documentType: string | null;
  documentNumber: string | null;
  documentDate: Date | null;
  amount: number;
  dueDate: Date | null;
  status: string;
};

type Props = {
  data: SupplierDocumentRow[];
  onEdit: (doc: SupplierDocumentRow) => void;
  onCancelSuccess: () => void;
};

const statusColors: Record<string, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-800",
  PAGADO: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export function PaymentTable({ data, onEdit, onCancelSuccess }: Props) {
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<SupplierDocumentRow | null>(null);

  const columns: ColumnDef<SupplierDocumentRow>[] = [
    {
      id: "supplierCode",
      accessorKey: "supplier",
      header: "RUT",
      cell: ({ row }) => row.original.supplier?.code ?? "—",
    },
    {
      id: "supplierName",
      accessorKey: "supplier",
      header: "Nombre",
      cell: ({ row }) => row.original.supplier?.name ?? "—",
    },
    {
      accessorKey: "documentType",
      header: "Tipo",
    },
    {
      accessorKey: "documentNumber",
      header: "N° Doc",
    },
    {
      accessorKey: "documentDate",
      header: "Fecha",
      cell: ({ row }) =>
        row.original.documentDate
          ? new Date(row.original.documentDate).toLocaleDateString()
          : "—",
    },
    {
      accessorKey: "amount",
      header: "Valor",
      cell: ({ row }) =>
        new Intl.NumberFormat("es-CL", {
          style: "currency",
          currency: "CLP",
        }).format(Number(row.original.amount)),
    },
    {
      accessorKey: "dueDate",
      header: "Vencimiento",
      cell: ({ row }) =>
        row.original.dueDate
          ? new Date(row.original.dueDate).toLocaleDateString()
          : "—",
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => (
        <Badge className={statusColors[row.original.status] ?? ""}>
          {row.original.status}
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
            variant="outline"
            className="border-blue-500 text-blue-500 hover:bg-blue-50"
            onClick={() => onEdit(row.original)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          {row.original.status !== "CANCELLED" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedDoc(row.original);
                setCancelModalOpen(true);
              }}
            >
              <X className="w-4 h-4 text-red-500" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  async function handleCancel(reason: string) {
    if (!selectedDoc) return;
    const res = await fetch(`/api/payments/${selectedDoc.id}/cancel`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancellationReason: reason }),
    });
    if (res.ok) {
      onCancelSuccess();
    }
  }

  return (
    <>
      <DataTable columns={columns} data={data} />
      <CancelModal
        open={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        onConfirm={handleCancel}
      />
    </>
  );
}
