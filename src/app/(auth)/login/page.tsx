"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { z } from "zod";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LoginSchema = z.object({
  email: z.string().min(1, "Usuario requerido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

type LoginInput = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const form = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginInput) {
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.ok) {
      router.push("/dashboard");
    } else {
      form.setError("root", { message: "Credenciales inválidas" });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle className="text-center text-2xl text-primary">MetalFlow</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Usuario" type="text" error={form.formState.errors.email?.message} {...form.register("email")} />
            <FormField label="Password" type="password" error={form.formState.errors.password?.message} {...form.register("password")} />
            {form.formState.errors.root && (
              <p className="text-sm text-red-500">{form.formState.errors.root.message}</p>
            )}
            <Button type="submit" className="w-full">Iniciar Sesión</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}