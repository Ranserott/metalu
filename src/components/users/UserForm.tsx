"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { CreateUserInput, UpdateUserInput } from "@/modules/users/validations/userSchemas";
import { CreateUserSchema, UpdateUserSchema } from "@/modules/users/validations/userSchemas";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { z } from "zod";

// Extended type for edit mode that includes optional password
type EditUserFormData = UpdateUserInput & { password?: string };
type UserFormData = CreateUserInput | EditUserFormData;

type UserFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UserFormData) => Promise<void>;
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

  const schema = isEditing ? UpdateUserSchema : CreateUserSchema;

  const form = useForm<UserFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name || "",
      email: defaultValues?.email || "",
      phone: defaultValues?.phone ?? "",
      roles: defaultValues?.roles || [],
    },
  });

  async function handleSubmit(data: UserFormData) {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      onOpenChange(false);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
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
          <FormField
            label="Teléfono"
            type="tel"
            placeholder="+56 9 ..."
            {...form.register("phone")}
            error={form.formState.errors.phone?.message}
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Nueva Contraseña (opcional)</label>
              <Input
                type="password"
                placeholder="Dejar vacío para no cambiar"
                {...form.register("password")}
              />
              {"password" in form.formState.errors && (
                <p className="text-sm text-red-500">{form.formState.errors.password?.message}</p>
              )}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Roles</label>
            <Controller
              name="roles"
              control={form.control}
              render={({ field }) => (
                <div className="flex gap-2 flex-wrap">
                  {roles.map((role) => {
                    const isSelected = (field.value as string[])?.includes(role.id);
                    return (
                      <Button
                        key={role.id}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const current = (field.value as string[]) || [];
                          const updated = current.includes(role.id)
                            ? current.filter((r) => r !== role.id)
                            : [...current, role.id];
                          field.onChange(updated);
                        }}
                      >
                        {role.name}
                      </Button>
                    );
                  })}
                </div>
              )}
            />
            {form.formState.errors.roles && (
              <p className="text-sm text-red-500">{form.formState.errors.roles.message as string}</p>
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