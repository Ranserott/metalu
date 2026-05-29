"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { User } from "@/modules/users/types/user";
import { UserForm } from "@/components/users/UserForm";
import { UpdateUserInput } from "@/modules/users/validations/userSchemas";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/users/${userId}`).then((res) => res.json()),
      fetch("/api/roles").then((res) => res.json()),
    ])
      .then(([userData, rolesData]) => {
        if (userData.user) setUser(userData.user);
        if (rolesData.roles) setRoles(rolesData.roles);
      })
      .catch(console.error);
  }, [userId]);

  async function handleSubmit(data: UpdateUserInput) {
    const response = await fetch(`/api/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Error al actualizar usuario");
    }

    toast.success("Usuario actualizado exitosamente");
    router.push("/users");
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const response = await fetch(`/api/users/${userId}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: password }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Error al cambiar contraseña");
        return;
      }

      toast.success("Contraseña cambiada exitosamente");
      setPassword("");
      setConfirmPassword("");
      setIsChangingPassword(false);
    } finally {
      setIsSubmittingPassword(false);
    }
  }

  if (!user) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Editar Usuario</h1>
        <p className="text-sm text-gray-500">Modifique los datos del usuario</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <UserForm
          open={true}
          onOpenChange={() => router.push("/users")}
          onSubmit={handleSubmit}
          defaultValues={{
            name: user.name,
            email: user.email,
            isActive: user.isActive,
            roles: user.roles.map((r) => r.id),
          }}
          isEditing={true}
          roles={roles}
          showPassword={false}
        />

        <Card>
          <CardHeader>
            <CardTitle>Cambiar Contraseña</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nueva Contraseña</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirmar Contraseña</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita la contraseña"
                />
              </div>
              <Button type="submit" disabled={isSubmittingPassword || !password || !confirmPassword}>
                {isSubmittingPassword ? "Cambiando..." : "Cambiar Contraseña"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
