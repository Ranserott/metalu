"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef, FilterFn } from "@tanstack/react-table";
import { Supplier } from "../types/supplier";
import { DataTable } from "@/components/tables/DataTable";
import { TableToolbar } from "@/components/tables/TableToolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Eye } from "lucide-react";
import { DeleteSupplierModal } from "./DeleteSupplierModal";
import { SUPPLIER_SEARCHABLE_KEYS } from "../constants/searchableKeys";
import { SUPPLIER_TABLE_FILTERS } from "../constants/tableFilters";

type Props = {
  data: Supplier[];
  onEdit: (supplier: Supplier) => void;
  onDeleteSuccess: () => void;
};

const statusColors: Record<string, string> = {
  Activo: "bg-green-100 text-green-800",
  Inactivo: "bg-gray-100 text-gray-800",
};

function normalize(s: string | null | undefined): string {
  return (s ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const supplierGlobalFilter: FilterFn<Supplier> = (row, _columnId, filterValue: string) => {
  if (!filterValue) return true;
  const q = normalize(filterValue);
  // Cast: `ciudad` exists at runtime but not in the Supplier TS type.
  const r = row.original as Supplier & { ciudad?: string | null };
  const haystack = SUPPLIER_SEARCHABLE_KEYS
    .map((k) => normalize(r[k as keyof typeof r] as string))
    .join(" ");
  return haystack.includes(q);
};

export function SupplierTable({ data, onEdit, onDeleteSuccess }: Props) {
  const router = useRouter();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
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

  const dynamicFilters = useMemo(() => {
    const ciudadOptions = Array.from(
      new Set(
        (data as Array<Supplier & { ciudad?: string | null }>)
          .map((s) => s.ciudad)
          .filter((c): c is string => Boolean(c))
      )
    )
      .sort()
      .map((c) => ({ value: c, label: c }));
    return [
      ...SUPPLIER_TABLE_FILTERS,
      {
        key: "ciudad", // matches the existing column accessorKey
        label: "Ciudad",
        options: ciudadOptions,
      },
    ];
  }, [data]);

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
      filterFn: (row, _columnId, filterValue: string) => {
        const r = row.original as Supplier & { ciudad?: string | null };
        return r.ciudad === filterValue;
      },
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
            variant="outline"
            className="border-gray-400 text-gray-600 hover:bg-gray-50"
            onClick={() => router.push(`/suppliers/${row.original.id}`)}
            title="Ver detalles y documentos"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-blue-500 text-blue-500 hover:bg-blue-50"
            onClick={() => onEdit(row.original)}
            title="Editar"
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
            title="Eliminar"
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
      <TableToolbar
        searchPlaceholder="Buscar por nombre, RUT, contacto..."
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        filters={dynamicFilters}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
      />
      <DataTable
        columns={columns}
        data={data}
        globalFilter={searchValue}
        onGlobalFilterChange={setSearchValue}
        globalFilterFn={supplierGlobalFilter}
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
      <DeleteSupplierModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleDelete}
        supplierName={selectedSupplier?.name ?? ""}
      />
    </>
  );
}
