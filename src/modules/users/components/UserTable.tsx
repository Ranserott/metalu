"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { User } from "../types/user";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Key } from "lucide-react";
import { DeleteUserModal } from "./DeleteUserModal";
import { ResetPasswordModal } from "./ResetPasswordModal";

type Props = {
  data: User[];
  onEdit: (user: User) => void;
  onDeleteSuccess: () => void;
  isAdmin: boolean;
};

const statusColors: Record<string, string> = {
  Activo: "bg-green-100 text-green-800",
  Inactivo: "bg-gray-100 text-gray-800",
};

export function UserTable({ data, onEdit, onDeleteSuccess, isAdmin }: Props) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const columns: ColumnDef<User>[] = [
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
        <div className="flex flex-wrap gap-1">
          {row.original.roles.map((ur) => (
            <Badge key={ur.role.id} variant="outline" className="text-xs">
              {ur.role.name}
            </Badge>
          ))}
        </div>
      ),
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
      accessorKey: "createdBy",
      header: "Creado por",
      cell: ({ row }) => row.original.createdBy?.name ?? "—",
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
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="border-orange-500 text-orange-500 hover:bg-orange-50"
              onClick={() => {
                setSelectedUser(row.original);
                setResetPasswordModalOpen(true);
              }}
            >
              <Key className="w-4 h-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelectedUser(row.original);
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
    if (!selectedUser) return;
    const res = await fetch(`/api/users/${selectedUser.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      onDeleteSuccess();
    }
  }

  async function handleResetPassword(newPassword: string): Promise<boolean> {
    if (!selectedUser) return false;
    const res = await fetch(`/api/users/${selectedUser.id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    return res.ok;
  }

  return (
    <>
      <DataTable columns={columns} data={data} />
      <DeleteUserModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleDelete}
        userName={selectedUser?.name ?? ""}
      />
      <ResetPasswordModal
        open={resetPasswordModalOpen}
        onOpenChange={setResetPasswordModalOpen}
        onConfirm={handleResetPassword}
        userName={selectedUser?.name ?? ""}
      />
    </>
  );
}
