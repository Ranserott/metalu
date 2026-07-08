"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { User } from "@/modules/users/types/user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/tables/DataTable";
import { Trash2 } from "lucide-react";
import Link from "next/link";

type Props = {
  data: User[];
};

export function UserTable({ data }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Nombre",
      },
      {
        accessorKey: "email",
        header: "Email",
      },
      {
        accessorKey: "roles",
        header: "Roles",
        cell: ({ row }) => (
          <div className="flex gap-1 flex-wrap">
            {row.original.roles.map((role) => (
              <Badge key={role.id} variant="secondary">
                {role.name}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        accessorKey: "isActive",
        header: "Estado",
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "default" : "destructive"}>
            {row.original.isActive ? "Activo" : "Inactivo"}
          </Badge>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const isDeleting = deletingId === row.original.id;
          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={<Link href={`/users/${row.original.id}/edit`}>Editar</Link>}
              />
              <Button
                size="sm"
                variant="ghost"
                disabled={isDeleting}
                onClick={async () => {
                  if (!confirm(`¿Eliminar al usuario ${row.original.name}?`)) return;
                  setDeletingId(row.original.id);
                  try {
                    const res = await fetch(`/api/users/${row.original.id}`, {
                      method: "DELETE",
                    });
                    if (!res.ok) {
                      const body = await res.json().catch(() => ({}));
                      alert(body.error ?? "No se pudo eliminar el usuario");
                      return;
                    }
                    router.refresh();
                  } finally {
                    setDeletingId(null);
                  }
                }}
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          );
        },
      },
    ],
    [deletingId, router]
  );

  return <DataTable columns={columns} data={data} />;
}