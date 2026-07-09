"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";
import { z } from "zod";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LoginSchema = z.object({
  username: z.string().min(1, "Usuario requerido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

type LoginInput = z.infer<typeof LoginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { username: "", password: "" },
  });

  async function onSubmit(data: LoginInput) {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        username: data.username,
        password: data.password,
        redirect: false,
      });

      if (result?.ok) {
        router.push(callbackUrl);
        return;
      }

      const detail = result?.error
        ? ` [${result.error}${result.status ? ` ${result.status}` : ""}]`
        : "";
      form.setError("root", { message: `Credenciales inválidas${detail}` });
    } catch (err) {
      console.error("[login] signIn threw:", err);
      form.setError("root", {
        message: `Error de red: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-[400px] border-[#004C63]">
      <CardHeader className="space-y-4 pb-4">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-[#004C63]">MetalFlow</h1>
          <p className="text-sm text-gray-500">Sistema de gestión industrial</p>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            label="Usuario"
            type="text"
            placeholder="admin"
            error={form.formState.errors.username?.message}
            {...form.register("username")}
          />
          <FormField
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            error={form.formState.errors.password?.message}
            {...form.register("password")}
          />
          {form.formState.errors.root && (
            <p className="text-sm text-red-500 text-center bg-red-500/10 p-2 rounded">
              {form.formState.errors.root.message}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#101D2D] to-[#1a2d3f]">
      <Suspense fallback={<div className="text-white">Cargando...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}