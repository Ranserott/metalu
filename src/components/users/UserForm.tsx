"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { CreateUserInput, UpdateUserInput, CreateUserSchema, UpdateUserSchema } from "@/modules/users/validations/userSchemas";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect } from "react";

type UserFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateUserInput | UpdateUserInput) => Promise<void>;
  defaultValues?: Partial<CreateUserInput | UpdateUserInput>;
  isEditing?: boolean;
  roles: { id: string; name: string }[];
  showPassword?: boolean;
};

export function UserForm({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isEditing = false,
  roles,
  showPassword = true,
}: UserFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    (defaultValues as any)?.roles || []
  );

  const schema = isEditing ? UpdateUserSchema : CreateUserSchema;

  const form = useForm<CreateUserInput | UpdateUserInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...defaultValues,
      roles: selectedRoles,
    },
  });

  useEffect(() => {
    form.setValue("roles", selectedRoles as any);
  }, [selectedRoles, form]);

  async function handleSubmit(data: CreateUserInput | UpdateUserInput) {
    setIsSubmitting(true);
    try {
      const submitData = isEditing
        ? { ...data, ...(password ? { password } : {}) }
        : { ...data, roles: selectedRoles };
      await onSubmit(submitData as any);
      onOpenChange(false);
      setPassword("");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleRole(roleId: string) {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((r) => r !== roleId)
        : [...prev, roleId]
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Usuario" : "Crear Usuario"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            label="Nombre"
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
          <FormField
            label="Email"
            type="email"
            {...form.register("email")}
            error={form.formState.errors.email?.message}
          />
          {showPassword && !isEditing && (
            <FormField
              label="Contraseña"
              type="password"
              {...form.register("password")}
              error={form.formState.errors.password?.message}
            />
          )}
          {showPassword && isEditing && (
            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium">Nueva Contraseña (opcional)</label>
              <input
                id="password"
                type="password"
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Dejar vacío para no cambiar"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {(form.formState.errors as any).password && (
                <p className="text-sm text-red-500">{(form.formState.errors as any).password?.message}</p>
              )}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Roles</label>
            <div className="flex gap-2 flex-wrap">
              {roles.map((role) => (
                <Button
                  key={role.id}
                  type="button"
                  variant={selectedRoles.includes(role.id) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleRole(role.id)}
                >
                  {role.name}
                </Button>
              ))}
            </div>
            {form.formState.errors.roles && (
              <p className="text-sm text-red-500">{form.formState.errors.roles.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}