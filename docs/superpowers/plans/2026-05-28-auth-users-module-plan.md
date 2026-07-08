# Auth & Users Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement login improvement and full CRUD for users with role assignment and password management.

**Architecture:** Login page gets UX improvements. Users module follows existing patterns (DataTable, FormField, Dialog). API routes handle CRUD with proper validation. RBAC via middleware protecting `/users/**` routes.

**Tech Stack:** Next.js 15, Prisma, NextAuth, shadcn/ui, react-hook-form + zod

---

## File Structure

```
src/
├── modules/
│   └── users/
│       ├── types/user.ts               # User type
│       ├── validations/userSchemas.ts  # Zod schemas
│       └── services/userService.ts     # Business logic
├── components/
│   └── users/
│       ├── UserTable.tsx               # DataTable with actions
│       └── UserForm.tsx                # Create/Edit form dialog
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx              # IMPROVED
│   ├── (dashboard)/
│   │   ├── users/
│   │   │   ├── page.tsx                # User list
│   │   │   ├── new/page.tsx           # Create form
│   │   │   └── [id]/edit/page.tsx     # Edit form
│   │   └── profile/
│   │       └── page.tsx               # Change own password
│   └── api/
│       └── users/
│           ├── route.ts                # GET all, POST create
│           └── [id]/
│               ├── route.ts            # PUT update, DELETE soft-delete
│               └── password/route.ts   # Admin password reset
│       └── profile/
│           └── password/route.ts       # Own password change
└── lib/auth/
    └── permissions.ts                  # RBAC helpers (extend existing)
```

---

## Task 1: Login Page Improvement

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

**Steps:**

- [ ] **Step 1: Read current login page**

Read: `src/app/(auth)/login/page.tsx`

- [ ] **Step 2: Improve login page UI**

Replace the login page with improved version:

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { z } from "zod";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LoginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

type LoginInput = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginInput) {
    setIsLoading(true);
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    setIsLoading(false);

    if (result?.ok) {
      router.push(callbackUrl);
    } else {
      form.setError("root", { message: "Credenciales inválidas" });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#101D2D] to-[#1a2d3f]">
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
              label="Email"
              type="email"
              placeholder="tu@email.com"
              error={form.formState.errors.email?.message}
              {...form.register("email")}
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
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/login/page.tsx
git commit -m "feat(auth): improve login page UX with loading state and better UI"
```

---

## Task 2: User Types and Validation Schemas

**Files:**
- Create: `src/modules/users/types/user.ts`
- Create: `src/modules/users/validations/userSchemas.ts`

**Steps:**

- [ ] **Step 1: Create user types**

Create: `src/modules/users/types/user.ts`

```typescript
import { Role } from "@/modules/roles/types/role";

export interface User {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdById: string | null;
  roles: Role[];
}

export interface UserWithPassword extends User {
  password: string;
}

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  roles: string[];
};

export type UpdateUserInput = {
  name?: string;
  email?: string;
  isActive?: boolean;
  roles?: string[];
};

export type ChangePasswordInput = {
  currentPassword?: string;
  newPassword: string;
};
```

- [ ] **Step 2: Create validation schemas**

Create: `src/modules/users/validations/userSchemas.ts`

```typescript
import { z } from "zod";

export const CreateUserSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(100, "Máximo 100 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  roles: z.array(z.string()).min(1, "Al menos un rol requerido"),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(100, "Máximo 100 caracteres").optional(),
  email: z.string().email("Email inválido").optional(),
  isActive: z.boolean().optional(),
  roles: z.array(z.string()).min(1, "Al menos un rol requerido").optional(),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(6, "Mínimo 6 caracteres").optional(),
  newPassword: z.string().min(6, "Mínimo 6 caracteres"),
});

export const ChangePasswordAdminSchema = z.object({
  newPassword: z.string().min(6, "Mínimo 6 caracteres"),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type ChangePasswordAdminInput = z.infer<typeof ChangePasswordAdminSchema>;
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/users/types/user.ts src/modules/users/validations/userSchemas.ts
git commit -m "feat(users): add user types and validation schemas"
```

---

## Task 3: User Service (Business Logic)

**Files:**
- Create: `src/modules/users/services/userService.ts`

**Steps:**

- [ ] **Step 1: Create user service**

Create: `src/modules/users/services/userService.ts`

```typescript
import { prisma } from "@/lib/prisma/prisma";
import bcrypt from "bcryptjs";
import { CreateUserInput, UpdateUserInput } from "../validations/userSchemas";

export async function getUsers() {
  return prisma.user.findMany({
    where: { deletedAt: null },
    include: { roles: { include: { role: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id, deletedAt: null },
    include: { roles: { include: { role: true } } },
  });
}

export async function createUser(data: CreateUserInput, createdById: string) {
  const hashedPassword = await bcrypt.hash(data.password, 10);

  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      createdById,
      roles: {
        create: data.roles.map((roleId) => ({ roleId })),
      },
    },
    include: { roles: { include: { role: true } } },
  });
}

export async function updateUser(id: string, data: UpdateUserInput) {
  return prisma.user.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.roles !== undefined && {
        roles: {
          deleteMany: {},
          create: data.roles.map((roleId) => ({ roleId })),
        },
      }),
    },
    include: { roles: { include: { role: true } } },
  });
}

export async function deleteUser(id: string) {
  return prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function changePassword(id: string, newPassword: string) {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  return prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });
}

export async function changeOwnPassword(id: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error("Usuario no encontrado");

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) throw new Error("Contraseña actual incorrecta");

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  return prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });
}

export async function canDeleteUser(userId: string): Promise<{ can: boolean; reason?: string }> {
  const userToDelete = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });

  if (!userToDelete) return { can: false, reason: "Usuario no encontrado" };

  const isAdmin = userToDelete.roles.some((r) => r.role.name === "admin");
  if (!isAdmin) return { can: true }; // Non-admins can always be deleted

  // Check if there are other active admins
  const otherAdmins = await prisma.user.count({
    where: {
      deletedAt: null,
      isActive: true,
      id: { not: userId },
      roles: { some: { role: { name: "admin" } } },
    },
  });

  if (otherAdmins === 0) {
    return { can: false, reason: "No se puede eliminar al último administrador" };
  }

  return { can: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/users/services/userService.ts
git commit -m "feat(users): add user service with CRUD operations"
```

---

## Task 4: API Routes (CRUD + Password)

**Files:**
- Create: `src/app/api/users/route.ts`
- Create: `src/app/api/users/[id]/route.ts`
- Create: `src/app/api/users/[id]/password/route.ts`
- Create: `src/app/api/profile/password/route.ts`

**Steps:**

- [ ] **Step 1: Create users API routes**

Create: `src/app/api/users/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getUsers, createUser } from "@/modules/users/services/userService";
import { CreateUserSchema } from "@/modules/users/validations/userSchemas";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !session.user.roles.includes("admin")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const users = await getUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.roles.includes("admin")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const validated = CreateUserSchema.parse(body);

    const user = await createUser(validated, session.user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    if (error.code === "P2002") {
      return NextResponse.json({ error: "El email ya existe" }, { status: 400 });
    }
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
```

Create: `src/app/api/users/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getUserById, updateUser, deleteUser, canDeleteUser } from "@/modules/users/services/userService";
import { UpdateUserSchema } from "@/modules/users/validations/userSchemas";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.roles.includes("admin")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.roles.includes("admin")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = UpdateUserSchema.parse(body);

    const user = await updateUser(id, validated);
    return NextResponse.json({ user });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    if (error.code === "P2002") {
      return NextResponse.json({ error: "El email ya existe" }, { status: 400 });
    }
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.roles.includes("admin")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;

    // Check if trying to delete self
    if (id === session.user.id) {
      return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });
    }

    // Check if can delete (last admin check)
    const { can, reason } = await canDeleteUser(id);
    if (!can) {
      return NextResponse.json({ error: reason }, { status: 400 });
    }

    await deleteUser(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
```

Create: `src/app/api/users/[id]/password/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { changePassword } from "@/modules/users/services/userService";
import { ChangePasswordAdminSchema } from "@/modules/users/validations/userSchemas";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.roles.includes("admin")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = ChangePasswordAdminSchema.parse(body);

    await changePassword(id, validated.newPassword);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error changing password:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
```

Create: `src/app/api/profile/password/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { changeOwnPassword } from "@/modules/users/services/userService";
import { ChangePasswordSchema } from "@/modules/users/validations/userSchemas";

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validated = ChangePasswordSchema.parse(body);

    await changeOwnPassword(session.user.id, validated.currentPassword!, validated.newPassword);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    if (error.message === "Contraseña actual incorrecta") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error changing own password:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/users/route.ts src/app/api/users/[id]/route.ts src/app/api/users/[id]/password/route.ts src/app/api/profile/password/route.ts
git commit -m "feat(users): add API routes for CRUD and password management"
```

---

## Task 5: User Components (Table + Form)

**Files:**
- Create: `src/components/users/UserTable.tsx`
- Create: `src/components/users/UserForm.tsx`

**Steps:**

- [ ] **Step 1: Create UserTable component**

Create: `src/components/users/UserTable.tsx`

```tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { User } from "@/modules/users/types/user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/tables/DataTable";
import Link from "next/link";

export const columns: ColumnDef<User>[] = [
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
    cell: ({ row }) => (
      <div className="flex gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={`/users/${row.original.id}/edit`}>Editar</Link>
        </Button>
      </div>
    ),
  },
];

export function UserTable({ data }: { data: User[] }) {
  return <DataTable columns={columns} data={data} />;
}
```

- [ ] **Step 2: Create UserForm component**

Create: `src/components/users/UserForm.tsx`

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { User, CreateUserInput, UpdateUserInput } from "@/modules/users/types/user";
import { CreateUserSchema, UpdateUserSchema } from "@/modules/users/validations/userSchemas";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    form.setValue("roles", selectedRoles);
  }, [selectedRoles, form]);

  async function handleSubmit(data: CreateUserInput | UpdateUserInput) {
    setIsSubmitting(true);
    try {
      await onSubmit({ ...data, roles: selectedRoles } as any);
      onOpenChange(false);
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
            <FormField
              label="Nueva Contraseña (opcional)"
              type="password"
              placeholder="Dejar vacío para no cambiar"
              {...form.register("password" as any)}
              error={form.formState.errors.password?.message}
            />
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
```

- [ ] **Step 3: Commit**

```bash
git add src/components/users/UserTable.tsx src/components/users/UserForm.tsx
git commit -m "feat(users): add UserTable and UserForm components"
```

---

## Task 6: User Pages (List, Create, Edit)

**Files:**
- Create: `src/app/(dashboard)/users/page.tsx`
- Create: `src/app/(dashboard)/users/new/page.tsx`
- Create: `src/app/(dashboard)/users/[id]/edit/page.tsx`

**Steps:**

- [ ] **Step 1: Create users list page**

Create: `src/app/(dashboard)/users/page.tsx`

```tsx
import { getUsers } from "@/modules/users/services/userService";
import { getRoles } from "@/modules/roles/services/roleService";
import { UserTable } from "@/components/users/UserTable";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function UsersPage() {
  const [users, roles] = await Promise.all([getUsers(), getRoles()]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-sm text-gray-500">Gestión de usuarios y roles</p>
        </div>
        <Button asChild>
          <Link href="/users/new">Crear Usuario</Link>
        </Button>
      </div>

      <UserTable
        data={users.map((u) => ({
          ...u,
          roles: u.roles.map((ur) => ur.role),
        }))}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create user creation page**

Create: `src/app/(dashboard)/users/new/page.tsx`

```tsx
"use client";

import { useRouter } from "next/navigation";
import { UserForm } from "@/components/users/UserForm";
import { CreateUserInput } from "@/modules/users/validations/userSchemas";
import { toast } from "sonner";

export default function NewUserPage() {
  const router = useRouter();

  async function handleSubmit(data: CreateUserInput) {
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
    router.refresh();
  }

  // Fetch roles client-side for the form
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/roles")
      .then((res) => res.json())
      .then((data) => setRoles(data.roles || []))
      .catch(() => setRoles([]));
  }, []);

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
```

Fix the import issue - add `useState, useEffect`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserForm } from "@/components/users/UserForm";
import { CreateUserInput } from "@/modules/users/validations/userSchemas";
import { toast } from "sonner";

export default function NewUserPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/roles")
      .then((res) => res.json())
      .then((data) => setRoles(data.roles || []))
      .catch(() => setRoles([]));
  }, []);

  async function handleSubmit(data: CreateUserInput) {
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
```

- [ ] **Step 3: Create user edit page**

Create: `src/app/(dashboard)/users/[id]/edit/page.tsx`

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { User } from "@/modules/users/types/user";
import { UserForm } from "@/components/users/UserForm";
import { UpdateUserInput } from "@/modules/users/validations/userSchemas";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/forms/FormField";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    // Fetch user and roles in parallel
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
              <FormField
                label="Nueva Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
              <FormField
                label="Confirmar Contraseña"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita la contraseña"
              />
              <Button type="submit" disabled={!password || !confirmPassword}>
                Cambiar Contraseña
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/users/page.tsx src/app/\(dashboard\)/users/new/page.tsx src/app/\(dashboard\)/users/\[id\]/edit/page.tsx
git commit -m "feat(users): add users pages (list, create, edit)"
```

---

## Task 7: Profile Page (Change Own Password)

**Files:**
- Create: `src/app/(dashboard)/profile/page.tsx`

**Steps:**

- [ ] **Step 1: Create profile page**

Create: `src/app/(dashboard)/profile/page.tsx`

```tsx
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function ProfilePage() {
  const { data: session } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al cambiar contraseña");
      }

      toast.success("Contraseña cambiada exitosamente");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Error al cambiar contraseña");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Mi Perfil</h1>
        <p className="text-sm text-gray-500">Gestiona tu información y contraseña</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cambiar Mi Contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <p className="text-sm font-medium">Email: {session?.user?.email}</p>
              <p className="text-sm font-medium">Nombre: {session?.user?.name}</p>
            </div>
            <FormField
              label="Contraseña Actual"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <FormField
              label="Nueva Contraseña"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
            />
            <FormField
              label="Confirmar Nueva Contraseña"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita la nueva contraseña"
              required
            />
            <Button type="submit" disabled={isSubmitting || !currentPassword || !newPassword || !confirmPassword}>
              {isSubmitting ? "Guardando..." : "Cambiar Contraseña"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/profile/page.tsx
git commit -m "feat(users): add profile page for own password change"
```

---

## Task 8: RBAC Protection

**Files:**
- Modify: `src/lib/auth/permissions.ts`

**Steps:**

- [ ] **Step 1: Extend permissions helper**

Modify `src/lib/auth/permissions.ts` to add helpers for role checking:

```typescript
// Add at end of file:

export function isAdmin(roles: string[]): boolean {
  return roles.includes("admin");
}

export function hasAccess(roles: string[], resource: string): boolean {
  // Admin has access to everything
  if (roles.includes("admin")) return true;

  // For now, trabajadores only have access to dashboard
  if (roles.includes("trabajador") && resource === "dashboard") return true;

  return false;
}
```

- [ ] **Step 2: Create middleware for route protection**

Create: `src/middleware.ts` (if not exists)

Check if middleware exists first:

```bash
ls src/middleware.ts 2>/dev/null || echo "not found"
```

If not found, create:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";

export default async function middleware(request: Request) {
  const { pathname } = new URL(request.url);

  // Public routes
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Check authentication
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Protect /users routes - admin only
  if (pathname.startsWith("/users")) {
    if (!session.user.roles.includes("admin")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/permissions.ts src/middleware.ts
git commit -m "feat(auth): add RBAC middleware for route protection"
```

---

## Task 9: Add Roles API Route (for fetching roles)

**Files:**
- Create: `src/app/api/roles/route.ts`

**Steps:**

- [ ] **Step 1: Create roles API route**

Create: `src/app/api/roles/route.ts`

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getRoles } from "@/modules/roles/services/roleService";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const roles = await getRoles();
    return NextResponse.json({ roles });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/roles/route.ts
git commit -m "feat(users): add roles API endpoint"
```

---

## Execution Options

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?