"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { User } from "@/modules/users/types/user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/tables/DataTable";
import { toast } from "sonner";
import Link from "next/link";

type Props = {
  data: User[];
  /**
   * The currently authenticated user's id. Used to disable the
   * self-delete button (the API also blocks it server-side).
   */
  currentUserId?: string;
};

export function UserTable({ data, currentUserId }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(user: User) {
    if (user.id === currentUserId) {
      toast.error("No podés eliminarte a vos mismo");
      return;
    }
    if (!confirm(`¿Eliminar al usuario "${user.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    setDeletingId(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          typeof data.error === "string" ? data.error : "Error al eliminar usuario";
        toast.error(message);
        return;
      }
      toast.success("Usuario eliminado");
      router.refresh();
    } catch (err) {
      console.error("[UserTable] delete error:", err);
      toast.error("Error de red al eliminar usuario");
    } finally {
      setDeletingId(null);
    }
  }

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: "Nombre",
    },
    {
      accessorKey: "phone",
      header: "Teléfono",
      cell: ({ row }) => row.original.phone ?? "—",
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
        const user = row.original;
        const isSelf = user.id === currentUserId;
        return (
          <div className="flex gap-2">
            <Link
              href={`/users/${user.id}/edit`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Editar
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(user)}
              disabled={deletingId === user.id || isSelf}
              className="text-red-600 border-red-300 hover:bg-red-50"
              title={isSelf ? "No podés eliminarte a vos mismo" : "Eliminar"}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return <DataTable columns={columns} data={data} />;
}