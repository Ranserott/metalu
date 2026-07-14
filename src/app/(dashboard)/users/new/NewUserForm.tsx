"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserForm } from "@/components/users/UserForm";
import { CreateUserInput, UpdateUserInput } from "@/modules/users/validations/userSchemas";
import { toast } from "sonner";

interface NewUserFormProps {
  roles: { id: string; name: string }[];
}

// Matches UserForm's UserFormData = CreateUserInput | (UpdateUserInput & { password?: string }).
type UserFormData = CreateUserInput | (UpdateUserInput & { password?: string });

export default function NewUserForm({ roles }: NewUserFormProps) {
  const router = useRouter();

  async function handleSubmit(data: UserFormData) {
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Error al crear usuario");
    }

    toast.success("Usuario creado exitosamente");
    router.push("/users");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Crear Usuario</h1>
        <p className="text-sm text-gray-500">Complete los datos del nuevo usuario</p>
      </div>

      <div className="max-w-xl">
        <UserForm
          open={true}
          onOpenChange={() => router.push("/users")}
          onSubmit={handleSubmit}
          roles={roles}
          showPassword={true}
        />
      </div>
    </div>
  );
}