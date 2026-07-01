"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef, FilterFn } from "@tanstack/react-table";
import { Client } from "../types/client";
import { ClientInput } from "../validations/clientSchemas";
import { DataTable } from "@/components/tables/DataTable";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientForm } from "./ClientForm";
import { ClientDetailModal } from "./ClientDetailModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Eye, Pencil, Power, UserPlus } from "lucide-react";
import { CLIENT_SEARCHABLE_KEYS } from "../constants/searchableKeys";
import { CLIENT_TABLE_FILTERS } from "../constants/tableFilters";

const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" });

/** Strip diacritics and lowercase for accent-insensitive search. */
function normalize(s: string | null | undefined): string {
  return (s ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const clientGlobalFilter: FilterFn<Client> = (row, _columnId, filterValue: string) => {
  if (!filterValue) return true;
  const q = normalize(filterValue);
  const haystack = CLIENT_SEARCHABLE_KEYS
    .map((k) => row.original[k] as unknown)
    .map(normalize as (v: unknown) => string)
    .join(" ");
  return haystack.includes(q);
};

export function ClientTable({ data }: { data: Client[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [toggleClient, setToggleClient] = useState<Client | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string | undefined>>({});

  const columnFilters = useMemo(
    () =>
      Object.entries(filterValues)
        .filter(([, v]) => v !== undefined)
        .map(([id, value]) => ({ id, value })),
    [filterValues]
  );

  const handleFilterChange = (key: string, value: string | undefined) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  async function handleCreateClient(data: ClientInput) {
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Error al crear cliente");
    router.refresh();
  }

  async function handleToggleConfirm() {
    if (!toggleClient) return;
    setTogglingId(toggleClient.id);
    try {
      const res = await fetch(`/api/clients/${toggleClient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !toggleClient.isActive }),
      });
      if (!res.ok) throw new Error("Error al cambiar el estado del cliente");
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Error");
    } finally {
      setTogglingId(null);
      setToggleClient(null);
    }
  }

  async function doActivate(client: Client) {
    setTogglingId(client.id);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (!res.ok) throw new Error("Error al activar el cliente");
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Error");
    } finally {
      setTogglingId(null);
    }
  }

  function startDeactivate(client: Client) {
    setToggleClient(client);
  }

  function startActivate(client: Client) {
    void doActivate(client);
  }

  const columns: ColumnDef<Client>[] = [
    { accessorKey: "code", header: "Código" },
    { accessorKey: "name", header: "Nombre" },
    { accessorKey: "contact", header: "Contacto" },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "phone", header: "Teléfono" },
    {
      id: "balance",
      header: "Saldo",
      cell: ({ row }) =>
        row.original.currentBalance != null
          ? clp.format(row.original.currentBalance)
          : "—",
    },
    {
      accessorKey: "isActive",
      header: "Estado",
      cell: ({ row }) => (
        <Badge
          className={
            row.original.isActive
              ? "bg-green-100 text-green-800 border-green-200"
              : "bg-gray-100 text-gray-800 border-gray-200"
          }
        >
          {row.original.isActive ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 border-blue-500 text-blue-600 hover:bg-blue-50"
              onClick={() => setViewId(c.id)}
              title="Ver detalles"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 border-blue-500 text-blue-600 hover:bg-blue-50"
              onClick={() => setEditClient(c)}
              title="Editar"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            {c.isActive ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0 border-red-300 text-red-500 hover:bg-red-50"
                onClick={() => startDeactivate(c)}
                title="Desactivar"
              >
                <Power className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0 border-green-500 text-green-600 hover:bg-green-50"
                onClick={() => startActivate(c)}
                disabled={togglingId === c.id}
                title="Activar"
              >
                <Power className="w-4 h-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <TableToolbar
          searchPlaceholder="Buscar por nombre, RUT, email..."
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          filters={CLIENT_TABLE_FILTERS}
          filterValues={filterValues}
          onFilterChange={handleFilterChange}
        />
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-dark)] hover:from-[var(--theme-dark)] hover:to-[var(--theme-darker)] text-white"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Registrar Cliente
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={data}
        globalFilter={searchValue}
        onGlobalFilterChange={setSearchValue}
        globalFilterFn={clientGlobalFilter}
        columnFilters={columnFilters}
        onColumnFiltersChange={(updater) => {
          const next = typeof updater === "function" ? updater(columnFilters) : updater;
          const map: Record<string, string | undefined> = {};
          for (const f of next) {
            map[f.id] = f.value as string | undefined;
          }
          setFilterValues(map);
        }}
      />

      <ClientForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreateClient}
      />

      <ClientForm
        key={editClient?.id ?? "new"}
        open={editClient !== null}
        onOpenChange={(o) => !o && setEditClient(null)}
        onSubmit={async () => {}}
        defaultValues={editClient ?? undefined}
        clientId={editClient?.id}
        editMode={editClient !== null}
      />

      <ClientDetailModal
        open={viewId !== null}
        onOpenChange={(o) => !o && setViewId(null)}
        clientId={viewId}
      />

      <ConfirmDialog
        open={toggleClient !== null}
        onOpenChange={(o) => !o && setToggleClient(null)}
        title="Desactivar cliente"
        description={
          toggleClient
            ? `¿Desactivar a ${toggleClient.name}? El cliente no aparecerá en cotizaciones ni trabajos nuevos, pero su historial se preserva.`
            : ""
        }
        confirmLabel="Desactivar"
        variant="destructive"
        loading={togglingId !== null}
        onConfirm={handleToggleConfirm}
      />
    </>
  );
}
