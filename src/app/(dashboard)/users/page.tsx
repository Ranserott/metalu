"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { UserTable } from "@/modules/users/components/UserTable";
import { User } from "@/modules/users/types/user";
import { UserAccordion } from "@/modules/users/components/UserAccordion";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editData, setEditData] = useState<{ id: string; email: string; name: string; isActive: boolean; roleIds: string[] } | undefined>();
  const [modalOpen, setModalOpen] = useState(false);

  const fetchUsers = async () => {
    const res = await fetch("/api/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  function handleEdit(user: User) {
    setEditData({
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      roleIds: user.roles.map((r) => r.role.id),
    });
    setModalOpen(true);
  }

  function handleEditClear() {
    setEditData(undefined);
  }

  function handleSuccess() {
    fetchUsers();
    setEditData(undefined);
    setModalOpen(false);
  }

  function handleNewUser() {
    setEditData(undefined);
    setModalOpen(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  const isAdmin = session?.user?.roles?.includes("Admin");

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-sm text-gray-500">Gestión de usuarios del sistema</p>
        </div>
        <Button onClick={handleNewUser} className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-dark)]">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden shadow-sm">
        <UserTable
          data={users}
          onEdit={handleEdit}
          onDeleteSuccess={fetchUsers}
          isAdmin={isAdmin ?? false}
        />
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[var(--theme-dark)]">
              {editData ? "MODIFICAR USUARIO" : "INGRESAR USUARIO"}
            </DialogTitle>
          </DialogHeader>
          <UserAccordion
            onSuccess={handleSuccess}
            editData={editData}
            onEditClear={handleEditClear}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
