"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserSchema } from "../validations/userSchemas";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Eraser, Save } from "lucide-react";

type FormData = {
  email: string;
  name: string;
  password: string;
  isActive: boolean;
};

type Props = {
  onSuccess?: () => void;
  editData?: { id: string; email: string; name: string; isActive: boolean; roleIds: string[] };
  onEditClear?: () => void;
};

export function UserAccordion({ onSuccess, editData, onEditClear }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const accordionRef = useRef<HTMLDivElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(UserSchema) as any,
    defaultValues: { email: "", name: "", password: "", isActive: true },
  });

  useEffect(() => {
    fetch("/api/roles")
      .then((res) => res.json())
      .then((data) => setRoles(data.map((r: any) => ({ id: r.id, name: r.name }))))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (editData) {
      setExpanded(true);
      setSelectedRoles(editData.roleIds || []);
      form.reset({
        email: editData.email,
        name: editData.name,
        password: "",
        isActive: editData.isActive,
      });
      setTimeout(() => {
        accordionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [editData, form]);

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const payload: any = { ...data, roleIds: selectedRoles };
      if (!data.password || data.password.length === 0) {
        delete payload.password;
      }
      const url = editData ? `/api/users/${editData.id}` : "/api/users";
      const method = editData ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error("Error saving: " + JSON.stringify(errorData));
      }

      form.reset({ email: "", name: "", password: "", isActive: true });
      setSelectedRoles([]);
      onSuccess?.();
      if (editData) onEditClear?.();
    } finally {
      setSubmitting(false);
    }
  }

  function handleClean() {
    form.reset({ email: "", name: "", password: "", isActive: true });
    setSelectedRoles([]);
    if (editData) onEditClear?.();
  }

  function toggleRole(roleId: string) {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  }

  return (
    <div ref={accordionRef} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-5 py-4 bg-gradient-to-r from-[var(--theme-dark)] to-[var(--theme-primary)] hover:from-[var(--theme-darker)] hover:to-[var(--theme-dark)] transition-all text-left"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-white" />
        ) : (
          <ChevronRight className="w-4 h-4 text-white" />
        )}
        <span className="font-semibold text-white text-sm uppercase tracking-wide">
          {editData ? "MODIFICAR USUARIO" : "INGRESAR USUARIO"}
        </span>
      </button>

      {expanded && (
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="NOMBRE"
              {...form.register("name")}
              error={form.formState.errors.name?.message}
              placeholder="Nombre del usuario"
            />

            <FormField
              label="EMAIL"
              type="email"
              {...form.register("email")}
              error={form.formState.errors.email?.message}
              placeholder="email@ejemplo.com"
            />

            <FormField
              label={editData ? "NUEVA CONTRASEÑA (opcional)" : "CONTRASEÑA"}
              type="password"
              {...form.register("password")}
              error={form.formState.errors.password?.message}
              placeholder="Mínimo 6 caracteres"
            />

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="isActive"
                {...form.register("isActive")}
                className="w-4 h-4 text-[var(--theme-dark)] border-gray-300 rounded focus:ring-[var(--theme-dark)]"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Usuario activo
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-gray-500 mb-2 block tracking-wide">ROLES</label>
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => toggleRole(role.id)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    selectedRoles.includes(role.id)
                      ? "bg-[var(--theme-dark)] text-white border-[var(--theme-dark)]"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {role.name}
                </button>
              ))}
            </div>
            {selectedRoles.length === 0 && (
              <p className="text-sm text-red-500 mt-1">Seleccione al menos un rol</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              className="border-gray-300 text-gray-600 hover:bg-gray-50"
              onClick={handleClean}
            >
              <Eraser className="w-4 h-4 mr-2" />
              LIMPIAR
            </Button>
            <Button
              type="submit"
              disabled={submitting || selectedRoles.length === 0}
              className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-dark)] hover:from-[var(--theme-dark)] hover:to-[var(--theme-darker)] text-white shadow-md"
            >
              <Save className="w-4 h-4 mr-2" />
              {submitting ? "GRABANDO..." : "GRABAR"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
