"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/tables/DataTable";
import { Eye } from "lucide-react";
import type { SolicitudOrdenCompraListItem } from "../types/solicitud";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SOLICITUD_GENERADA: "secondary",
  EN_REVISION: "default",
  ORDEN_EMITIDA: "default",
  RECHAZADA: "destructive",
  CANCELADA: "outline",
};

const STATUS_LABEL: Record<string, string> = {
  SOLICITUD_GENERADA: "Solicitud Generada",
  EN_REVISION: "En Revisión",
  ORDEN_EMITIDA: "Orden Emitida",
  RECHAZADA: "Rechazada",
  CANCELADA: "Cancelada",
};

export const columns: ColumnDef<SolicitudOrdenCompraListItem>[] = [
  {
    accessorKey: "number",
    header: "Número",
    cell: ({ row }) => (
      <span className="font-mono font-semibold">{row.original.number}</span>
    ),
  },
  {
    id: "workOrder",
    header: "Trabajo",
    cell: ({ row }) => row.original.workOrder?.number ?? "—",
  },
  {
    id: "client",
    header: "Cliente",
    cell: ({ row }) => row.original.client?.name ?? "—",
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => (
      <Badge variant={STATUS_VARIANT[row.original.status] ?? "secondary"}>
        {STATUS_LABEL[row.original.status] ?? row.original.status}
      </Badge>
    ),
  },
  {
    id: "supplier",
    header: "Proveedor",
    cell: ({ row }) => row.original.supplier?.name ?? <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: "fechaTrabajo",
    header: "Fecha Trabajo",
    cell: ({ row }) => new Date(row.original.fechaTrabajo).toLocaleDateString("es-CL"),
  },
  {
    accessorKey: "diasSinOC",
    header: "Días s/OC",
    cell: ({ row }) => row.original.diasSinOC,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Link href={`/purchases/solicitudes/${row.original.id}`}>
        <Button size="sm" variant="ghost">
          <Eye className="h-4 w-4" />
        </Button>
      </Link>
    ),
  },
];

export function SolicitudesTable({ data }: { data: SolicitudOrdenCompraListItem[] }) {
  return <DataTable columns={columns} data={data} />;
}
