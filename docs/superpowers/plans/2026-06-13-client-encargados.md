# Client Encargados Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Encargado" (contact person) sub-resource to the Client module so work orders can be linked to a specific person who requested them, with full traceability back to the main client.

**Architecture:** New `Encargado` Prisma model linked to `Client` (FK, cascade) and to `WorkOrder` (optional FK, SetNull on delete). New `src/modules/encargados/` module mirrors the existing `src/modules/clients/` structure: service + zod validation + types + three components (form, list section, selector). New REST endpoints under `/api/encargados` and `/api/encargados/[id]`. The `EncargadoListSection` slots into the existing `ClientDetailModal`; the `EncargadoSelector` slots into the existing `WorkOrderForm` replacing the current hardcoded ENCARGADOS list.

**Tech Stack:** Next.js 15 (App Router, async params), Prisma 6 + PostgreSQL, Zod, react-hook-form (existing) but the new components use plain `useState` + manual fetch (matching the pattern in `ClientForm`), shadcn/ui (Base UI) Dialog/Select/Input, lucide-react icons.

**Spec:** [`../specs/2026-06-13-client-encargados-design.md`](../specs/2026-06-13-client-encargados-design.md) (approved by user on 2026-06-13, pushed in commit `f0017ac`).

---

## File Structure

**Create:**
- `prisma/migrations/{timestamp}_add_encargados_module/migration.sql` (auto-generated)
- `src/modules/encargados/services/encargadoService.ts` — Prisma CRUD + business rules (RUT uniqueness, delete-safety check)
- `src/modules/encargados/validations/encargadoSchemas.ts` — Zod schemas
- `src/modules/encargados/types/encargado.ts` — TypeScript types
- `src/modules/encargados/components/EncargadoForm.tsx` — Create/edit modal form
- `src/modules/encargados/components/EncargadoListSection.tsx` — List inside ClientDetailModal
- `src/modules/encargados/components/EncargardoSelector.tsx` — Reusable combobox for WorkOrderForm
- `src/app/api/encargados/route.ts` — GET (list) + POST (create)
- `src/app/api/encargados/[id]/route.ts` — GET + PATCH + DELETE

**Modify:**
- `prisma/schema.prisma` — Add Encargado model + relations on Client, WorkOrder, User
- `src/modules/clients/components/ClientDetailModal.tsx` — Slot in `<EncargadoListSection>` between info cards and the quotations/invoices sections
- `src/modules/work-orders/types/workOrder.ts` — Add `encargadoId: string | null` + optional `encargado` include
- `src/modules/work-orders/validations/workOrderSchemas.ts` — Add `encargadoId: z.string().optional().nullable()`
- `src/modules/work-orders/services/workOrderService.ts` — Accept and persist `encargadoId`; include `encargado: { select: { id, name, rut } }` in returned relations
- `src/modules/work-orders/components/WorkOrderForm.tsx` — Replace hardcoded `ENCARGADOS` const + `encargado` state with `encargadoId` state + `<EncargadoSelector>`. Keep syncing the legacy `encargado` free-text field with the selected name.

---

## Task 1: Prisma Schema — Add Encargado Model and Relations

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the `Encargado` model**

In `prisma/schema.prisma`, after the `Client` model block (after line 108 — the closing `}` and `@@map("clients")`), add:

```prisma
model Encargado {
  id          String    @id @default(uuid())
  rut         String    @unique
  name        String
  email       String?
  phone       String?
  position    String?   @map("position")
  clientId    String    @map("client_id")
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")
  createdById String?   @map("created_by_id")

  client     Client      @relation(fields: [clientId], references: [id], onDelete: Cascade)
  createdBy  User?       @relation("EncargadoCreator", fields: [createdById], references: [id])
  workOrders WorkOrder[]

  @@map("encargados")
}
```

- [ ] **Step 2: Add `encargados` relation to `Client` model**

In the `Client` model (around line 82-108), inside the model body, add this line after `invoices Invoice[]`:

```prisma
  encargados Encargado[]
```

- [ ] **Step 3: Add `encargadoId` + `encargadoRef` relation to `WorkOrder` model**

In the `WorkOrder` model (around line 192-243), add after the `invoices Invoice[]` line (still inside the model body):

```prisma
  encargadoId  String?    @map("encargado_id")
  encargadoRef Encargado? @relation(fields: [encargadoId], references: [id], onDelete: SetNull)
```

**IMPORTANT:** The relation is named `encargadoRef` (not `encargado`) because `WorkOrder` already has a legacy `encargado String?` free-text field. Prisma forbids two fields with the same name in the same model. The legacy field is left untouched.

- [ ] **Step 4: Add `encargadosCreated` relation to `User` model**

In the `User` model (around line 13-42), add inside the model body (next to the other `created...` relations, around line 39):

```prisma
  createdEncargados Encargado[] @relation("EncargadoCreator")
```

- [ ] **Step 5: Verify the schema compiles**

Run: `npx prisma format`
Expected: File reformats cleanly, no errors.

Run: `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 6: Commit**

```bash
cd /Users/francisco/Desktop/metalu
git add prisma/schema.prisma
git commit -m "feat(prisma): add Encargado model and relations"
```

---

## Task 2: Run Prisma Migration

**Files:**
- Create: `prisma/migrations/{timestamp}_add_encargados_module/migration.sql` (auto)

- [ ] **Step 1: Run the migration**

Run: `npx prisma migrate dev --name add_encargados_module`
Expected: Migration runs successfully. You may be prompted to run `prisma generate` — answer `y` (or run it manually after). Output should show:

```
Your database is now in sync with your schema.
✔ Generated Prisma Client
```

- [ ] **Step 2: Verify the migration file exists**

Run: `ls prisma/migrations/`
Expected: A directory ending in `_add_encargados_module/` with a `migration.sql` inside.

- [ ] **Step 3: Verify the Prisma Client regenerated**

Run: `ls src/generated/prisma/ | head -20`
Expected: The `Encargado` model is in the generated client (you can `rg "model Encargado" src/generated/prisma/` to confirm).

- [ ] **Step 4: Commit the migration and generated client**

```bash
cd /Users/francisco/Desktop/metalu
git add prisma/migrations/
git status  # inspect: should show only the new migration directory
# If src/generated/prisma shows up as changed, add it too
git add src/generated/prisma/ 2>/dev/null || true
git commit -m "feat(prisma): add_encargados_module migration"
```

---

## Task 3: Create Encargado TypeScript Type

**Files:**
- Create: `src/modules/encargados/types/encargado.ts`

- [ ] **Step 1: Create the type file**

Create `src/modules/encargados/types/encargado.ts` with the following content:

```typescript
export type Encargado = {
  id: string;
  rut: string;
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  clientId: string;
  client: { id: string; name: string; code: string };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: { name: string } | null;
};

export type EncargadoInput = {
  rut: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  clientId: string;
};
```

- [ ] **Step 2: Commit**

```bash
cd /Users/francisco/Desktop/metalu
git add src/modules/encargados/types/encargado.ts
git commit -m "feat(encargados): add TypeScript types"
```

---

## Task 4: Create Encargado Zod Validation Schemas

**Files:**
- Create: `src/modules/encargados/validations/encargadoSchemas.ts`

- [ ] **Step 1: Create the validation file**

Create `src/modules/encargados/validations/encargadoSchemas.ts`:

```typescript
import { z } from "zod";

export const EncargadoSchema = z.object({
  rut: z.string().min(1, "RUT requerido"),
  name: z.string().min(1, "Nombre requerido"),
  email: z
    .string()
    .email("Email inválido")
    .optional()
    .or(z.literal("")),
  phone: z.string().optional(),
  position: z.string().optional(),
  clientId: z.string().min(1, "Cliente requerido"),
});

export type EncargadoInputValidated = z.infer<typeof EncargadoSchema>;
```

Note: RUT uniqueness is intentionally **not** in the Zod schema — it's enforced in the service so we can return a clean 409 with a Spanish message.

- [ ] **Step 2: Commit**

```bash
cd /Users/francisco/Desktop/metalu
git add src/modules/encargados/validations/encargadoSchemas.ts
git commit -m "feat(encargados): add Zod validation schemas"
```

---

## Task 5: Create Encargado Service

**Files:**
- Create: `src/modules/encargados/services/encargadoService.ts`

- [ ] **Step 1: Create the service file**

Create `src/modules/encargados/services/encargadoService.ts`:

```typescript
import { prisma } from "@/lib/prisma/prisma";
import { EncargadoInputValidated } from "../validations/encargadoSchemas";

const includeClient = {
  client: { select: { id: true, name: true, code: true } },
  createdBy: { select: { name: true } },
};

export async function getEncargados(opts?: { clientId?: string }) {
  return prisma.encargado.findMany({
    where: {
      deletedAt: null,
      ...(opts?.clientId ? { clientId: opts.clientId } : {}),
    },
    orderBy: { name: "asc" },
    include: includeClient,
  });
}

export async function getEncargadoById(id: string) {
  return prisma.encargado.findUnique({
    where: { id, deletedAt: null },
    include: includeClient,
  });
}

export async function createEncargado(
  data: EncargadoInputValidated,
  userId: string,
) {
  const client = await prisma.client.findUnique({
    where: { id: data.clientId, deletedAt: null },
  });
  if (!client) {
    throw new Error("Cliente inválido");
  }

  const existing = await prisma.encargado.findFirst({
    where: { rut: data.rut, deletedAt: null },
  });
  if (existing) {
    throw new Error("Ya existe un encargado con ese RUT");
  }

  return prisma.encargado.create({
    data: { ...data, createdById: userId },
    include: includeClient,
  });
}

export async function updateEncargado(
  id: string,
  data: Partial<EncargadoInputValidated>,
) {
  if (data.clientId) {
    const client = await prisma.client.findUnique({
      where: { id: data.clientId, deletedAt: null },
    });
    if (!client) {
      throw new Error("Cliente inválido");
    }
  }

  if (data.rut) {
    const existing = await prisma.encargado.findFirst({
      where: { rut: data.rut, deletedAt: null, NOT: { id } },
    });
    if (existing) {
      throw new Error("Ya existe un encargado con ese RUT");
    }
  }

  return prisma.encargado.update({
    where: { id },
    data,
    include: includeClient,
  });
}

export async function deleteEncargado(id: string) {
  const activeWorkOrders = await prisma.workOrder.count({
    where: { encargadoId: id, deletedAt: null },
  });
  if (activeWorkOrders > 0) {
    throw new Error(
      `Tiene ${activeWorkOrders} trabajo(s) asociado(s), no se puede eliminar`,
    );
  }

  return prisma.encargado.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/francisco/Desktop/metalu
git add src/modules/encargados/services/encargadoService.ts
git commit -m "feat(encargados): add service with RUT uniqueness and delete-safety"
```

---

## Task 6: Create `/api/encargados` Route (GET + POST)

**Files:**
- Create: `src/app/api/encargados/route.ts`

- [ ] **Step 1: Create the route file**

Create `src/app/api/encargados/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  getEncargados,
  createEncargado,
} from "@/modules/encargados/services/encargadoService";
import { EncargadoSchema } from "@/modules/encargados/validations/encargadoSchemas";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = req.nextUrl.searchParams.get("clientId") || undefined;
    const data = await getEncargados({ clientId });
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API /encargados GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = EncargadoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    try {
      const result = await createEncargado(parsed.data, session.user.id);
      return NextResponse.json(result, { status: 201 });
    } catch (serviceError: any) {
      const message = serviceError.message || "Error interno";
      const status = message.includes("Ya existe") ? 409 : 500;
      return NextResponse.json({ error: message }, { status });
    }
  } catch (error) {
    console.error("[API /encargados POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/francisco/Desktop/metalu
git add src/app/api/encargados/route.ts
git commit -m "feat(encargados): add /api/encargados GET and POST endpoints"
```

---

## Task 7: Create `/api/encargados/[id]` Route (GET + PATCH + DELETE)

**Files:**
- Create: `src/app/api/encargados/[id]/route.ts`

- [ ] **Step 1: Create the route file**

Create `src/app/api/encargados/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  getEncargadoById,
  updateEncargado,
  deleteEncargado,
} from "@/modules/encargados/services/encargadoService";
import { EncargadoSchema } from "@/modules/encargados/validations/encargadoSchemas";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const encargado = await getEncargadoById(id);
    if (!encargado) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(encargado);
  } catch (error) {
    console.error("[API /encargados/[id] GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = EncargadoSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    try {
      const updated = await updateEncargado(id, parsed.data);
      return NextResponse.json(updated);
    } catch (serviceError: any) {
      const message = serviceError.message || "Error interno";
      const status = message.includes("Ya existe")
        ? 409
        : message.includes("inválido")
        ? 400
        : 500;
      return NextResponse.json({ error: message }, { status });
    }
  } catch (error) {
    console.error("[API /encargados/[id] PATCH]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    try {
      await deleteEncargado(id);
      return NextResponse.json({ success: true });
    } catch (serviceError: any) {
      const message = serviceError.message || "Error interno";
      const status = message.includes("trabajo") ? 409 : 500;
      return NextResponse.json({ error: message }, { status });
    }
  } catch (error) {
    console.error("[API /encargados/[id] DELETE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/francisco/Desktop/metalu
git add src/app/api/encargados/\[id\]/route.ts
git commit -m "feat(encargados): add /api/encargados/[id] GET, PATCH, DELETE"
```

---

## Task 8: Create EncargadoForm Component

**Files:**
- Create: `src/modules/encargados/components/EncargadoForm.tsx`

- [ ] **Step 1: Create the form component**

Create `src/modules/encargados/components/EncargadoForm.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, X, User } from "lucide-react";
import { Encargado } from "../types/encargado";

type EncargadoFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (encargado: Encargado) => void;
  clientId: string;
  clientCode?: string;
  clientName?: string;
  edit?: Encargado | null;
};

const emptyValues = (clientId: string) => ({
  rut: "",
  name: "",
  email: "",
  phone: "",
  position: "",
  clientId,
});

export function EncargadoForm({
  open,
  onOpenChange,
  onSaved,
  clientId,
  clientCode,
  clientName,
  edit,
}: EncargadoFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState(emptyValues(clientId));

  useEffect(() => {
    if (edit) {
      setValues({
        rut: edit.rut,
        name: edit.name,
        email: edit.email || "",
        phone: edit.phone || "",
        position: edit.position || "",
        clientId: edit.clientId,
      });
    } else {
      setValues(emptyValues(clientId));
    }
    setError(null);
  }, [edit, clientId, open]);

  function update<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.rut.trim() || !values.name.trim()) {
      setError("RUT y Nombre son requeridos");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const url = edit ? `/api/encargados/${edit.id}` : "/api/encargados";
      const method = edit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${res.status}`);
      }

      const saved = (await res.json()) as Encargado;
      onSaved(saved);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}
    >
      <div className="bg-white rounded-xl shadow-2xl w-[600px] max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-[var(--theme-dark)] to-[var(--theme-primary)] px-6 py-4 flex items-center justify-between">
          <h2 className="text-white text-lg font-semibold flex items-center gap-2">
            <User className="w-5 h-5" />
            {edit ? "EDITAR ENCARGADO" : "AGREGAR ENCARGADO"}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-white hover:bg-white/20 rounded p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                RUT <span className="text-red-500">*</span>
              </label>
              <Input
                value={values.rut}
                onChange={(e) => update("rut", e.target.value)}
                placeholder="12.345.678-9"
                className="text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <Input
                value={values.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Nombre completo"
                className="text-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                Email
              </label>
              <Input
                type="email"
                value={values.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="email@ejemplo.cl"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                Teléfono
              </label>
              <Input
                value={values.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+56 9 1234 5678"
                className="text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
              Cargo
            </label>
            <Input
              value={values.position}
              onChange={(e) => update("position", e.target.value)}
              placeholder="Ej: Jefe de Compras"
              className="text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
              Cliente
            </label>
            <Input
              value={clientCode ? `${clientCode} - ${clientName || ""}` : ""}
              disabled
              className="text-sm bg-gray-50"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-gray-300 text-gray-700"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-dark)] hover:from-[var(--theme-dark)] hover:to-[var(--theme-darker)] text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {submitting ? "Guardando..." : edit ? "Guardar Cambios" : "Guardar Encargado"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/francisco/Desktop/metalu
git add src/modules/encargados/components/EncargadoForm.tsx
git commit -m "feat(encargados): add EncargadoForm component"
```

---

## Task 9: Create EncargadoListSection Component

**Files:**
- Create: `src/modules/encargados/components/EncargadoListSection.tsx`

- [ ] **Step 1: Create the list section component**

Create `src/modules/encargados/components/EncargadoListSection.tsx`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Pencil, Power, UserCog, Plus, Mail, Phone } from "lucide-react";
import { Encargado } from "../types/encargado";
import { EncargadoForm } from "./EncargadoForm";

type Props = {
  clientId: string;
  clientCode?: string;
  clientName?: string;
};

export function EncargadoListSection({ clientId, clientCode, clientName }: Props) {
  const [encargados, setEncargados] = useState<Encargado[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Encargado | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<Encargado | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchEncargados = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/encargados?clientId=${clientId}`);
      if (!res.ok) throw new Error("Error al cargar encargados");
      const data = (await res.json()) as Encargado[];
      setEncargados(data);
    } catch (err: any) {
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchEncargados();
  }, [fetchEncargados, refreshKey]);

  async function handleSaved(saved: Encargado) {
    setRefreshKey((k) => k + 1);
  }

  function openCreate() {
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(enc: Encargado) {
    setEditTarget(enc);
    setFormOpen(true);
  }

  async function handleToggleActive(enc: Encargado) {
    if (enc.isActive) {
      setConfirmDeactivate(enc);
      return;
    }
    await patchActive(enc, true);
  }

  async function patchActive(enc: Encargado, isActive: boolean) {
    try {
      const res = await fetch(`/api/encargados/${enc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al actualizar");
      }
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      alert(err.message || "Error");
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2.5 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCog className="w-4 h-4 text-[var(--theme-dark)]" />
          <span className="font-semibold text-xs text-gray-700 uppercase tracking-wide">
            Encargados
          </span>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={openCreate}
          className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-dark)] text-white"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Agregar encargado
        </Button>
      </div>

      <div className="divide-y max-h-64 overflow-y-auto">
        {loading && <p className="text-center text-sm text-gray-400 py-6">Cargando...</p>}
        {error && !loading && (
          <p className="text-center text-sm text-red-500 py-6">{error}</p>
        )}
        {!loading && !error && encargados.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-6">
            No hay encargados registrados para este cliente. Hacé click en
            &quot;Agregar encargado&quot;.
          </p>
        )}
        {!loading &&
          !error &&
          encargados.map((enc) => (
            <div
              key={enc.id}
              className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-gray-50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {enc.name}
                  </p>
                  <span className="text-[10px] uppercase text-gray-500">
                    {enc.rut}
                  </span>
                  {enc.position && (
                    <span className="text-[10px] uppercase tracking-wide text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {enc.position}
                    </span>
                  )}
                  {!enc.isActive && (
                    <span className="text-[10px] uppercase tracking-wide text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                      Inactivo
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                  {enc.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {enc.email}
                    </span>
                  )}
                  {enc.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {enc.phone}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openEdit(enc)}
                  className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                  title="Editar"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActive(enc)}
                  className={`p-1.5 rounded ${
                    enc.isActive
                      ? "hover:bg-red-50 text-red-600"
                      : "hover:bg-green-50 text-green-600"
                  }`}
                  title={enc.isActive ? "Desactivar" : "Activar"}
                >
                  <Power className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
      </div>

      <EncargadoForm
        key={editTarget?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={handleSaved}
        clientId={clientId}
        clientCode={clientCode}
        clientName={clientName}
        edit={editTarget}
      />

      <ConfirmDialog
        open={!!confirmDeactivate}
        onOpenChange={(o) => !o && setConfirmDeactivate(null)}
        title="Desactivar encargado"
        description={`¿Desactivar a ${confirmDeactivate?.name}?`}
        confirmLabel="Desactivar"
        variant="destructive"
        onConfirm={async () => {
          if (confirmDeactivate) {
            await patchActive(confirmDeactivate, false);
          }
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/francisco/Desktop/metalu
git add src/modules/encargados/components/EncargadoListSection.tsx
git commit -m "feat(encargados): add EncargadoListSection component"
```

---

## Task 10: Modify ClientDetailModal to Include EncargadoListSection

**Files:**
- Modify: `src/modules/clients/components/ClientDetailModal.tsx:133-154`

- [ ] **Step 1: Add the import**

At the top of `ClientDetailModal.tsx`, with the other module imports (after line 12), add:

```typescript
import { EncargadoListSection } from "@/modules/encargados/components/EncargadoListSection";
```

- [ ] **Step 2: Insert the section into the modal**

In `ClientDetailModal.tsx`, find the block right after the `notes` Section (around line 131, where you see `{client.notes && (...)}`) and **before** the `<Separator />` at line 133. Add:

```tsx
            <Separator />

            <EncargadoListSection
              clientId={client.id}
              clientCode={client.code}
              clientName={client.name}
            />
```

So the structure around line 127-135 becomes:

```tsx
            {client.notes && (
              <Section icon={FileText} title="Notas">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.notes}</p>
              </Section>
            )}

            <Separator />

            <EncargadoListSection
              clientId={client.id}
              clientCode={client.code}
              clientName={client.name}
            />

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* ... existing quotations + invoices sections ... */}
```

- [ ] **Step 3: Verify the file builds**

Run: `npx tsc --noEmit --project tsconfig.json 2>&1 | head -40`
Expected: No errors related to `ClientDetailModal.tsx`. (Other unrelated errors in the codebase are OK.)

- [ ] **Step 4: Commit**

```bash
cd /Users/francisco/Desktop/metalu
git add src/modules/clients/components/ClientDetailModal.tsx
git commit -m "feat(clients): add EncargadoListSection to ClientDetailModal"
```

---

## Task 11: Create EncargadoSelector Component

**Files:**
- Create: `src/modules/encargados/components/EncargadoSelector.tsx`

- [ ] **Step 1: Create the selector component**

Create `src/modules/encargados/components/EncargadoSelector.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { Plus, Search } from "lucide-react";
import { Encargado } from "../types/encargado";
import { EncargadoForm } from "./EncargadoForm";

type Props = {
  value: string | null;
  onChange: (encargadoId: string | null, encargado: Encargado | null) => void;
  clientId?: string | null;
  className?: string;
};

export function EncargadoSelector({ value, onChange, clientId, className }: Props) {
  const [encargados, setEncargados] = useState<Encargado[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/encargados");
        if (!res.ok) throw new Error("Error al cargar encargados");
        const data = (await res.json()) as Encargado[];
        if (!cancelled) setEncargados(data);
      } catch (err) {
        console.error("[EncargadoSelector] load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = encargados.filter((e) => {
    if (!e.isActive) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      e.rut.toLowerCase().includes(q) ||
      e.client.name.toLowerCase().includes(q)
    );
  });

  const grouped = filtered.reduce<Record<string, Encargado[]>>((acc, e) => {
    const key = e.client.name;
    (acc[key] ||= []).push(e);
    return acc;
  }, {});

  const selected = encargados.find((e) => e.id === value) || null;

  function pick(enc: Encargado) {
    onChange(enc.id, enc);
    setOpen(false);
    setSearch("");
  }

  function clear() {
    onChange(null, null);
  }

  function openCreate() {
    if (!clientId) {
      alert("Selecciona primero un cliente");
      return;
    }
    setFormOpen(true);
  }

  function handleCreated(saved: Encargado) {
    setEncargados((prev) => [...prev, saved]);
    onChange(saved.id, saved);
  }

  return (
    <div className={`relative ${className || ""}`}>
      {selected && !open ? (
        <div className="flex items-center gap-2 border border-gray-300 rounded px-3 py-2 bg-white">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {selected.name}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {selected.rut} · {selected.client.name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs text-blue-600 hover:underline"
          >
            Cambiar
          </button>
          <button
            type="button"
            onClick={clear}
            className="text-xs text-red-600 hover:underline"
          >
            Quitar
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 border border-gray-300 rounded px-3 py-2 bg-white">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setOpen(true)}
              placeholder="Buscar encargado por nombre, RUT o cliente..."
              className="flex-1 text-sm outline-none"
            />
            {loading && <span className="text-xs text-gray-400">cargando...</span>}
          </div>

          {open && (
            <div className="absolute z-50 mt-1 w-full bg-white border rounded shadow-lg max-h-72 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-4">
                  Sin resultados
                </p>
              ) : (
                Object.entries(grouped).map(([clientName, list]) => (
                  <div key={clientName}>
                    <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-gray-500 bg-gray-50 border-b">
                      {clientName}
                    </div>
                    {list.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => pick(e)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {e.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {e.rut}
                            {e.position ? ` · ${e.position}` : ""}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ))
              )}
              <button
                type="button"
                onClick={openCreate}
                className="w-full text-left px-3 py-2 border-t bg-gray-50 hover:bg-blue-50 text-sm text-[var(--theme-dark)] font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Agregar nuevo encargado
              </button>
            </div>
          )}
        </>
      )}

      {clientId && (
        <EncargadoForm
          open={formOpen}
          onOpenChange={setFormOpen}
          onSaved={handleCreated}
          clientId={clientId}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/francisco/Desktop/metalu
git add src/modules/encargados/components/EncargadoSelector.tsx
git commit -m "feat(encargados): add EncargadoSelector combobox component"
```

---

## Task 12: Modify WorkOrder Types, Schemas, Service for `encargadoId`

**Files:**
- Modify: `src/modules/work-orders/types/workOrder.ts`
- Modify: `src/modules/work-orders/validations/workOrderSchemas.ts`
- Modify: `src/modules/work-orders/services/workOrderService.ts`

- [ ] **Step 1: Add `encargadoId` to the type**

In `src/modules/work-orders/types/workOrder.ts`, add to the `WorkOrder` type (next to the existing `encargado` field on line 31):

```typescript
  encargadoId: string | null;
  encargado?: { id: string; name: string; rut: string; client: { id: string; name: string } } | null;
```

So the block around line 30-32 becomes:

```typescript
  fechaTrabajo: Date | null;
  local: string | null;
  encargado: string | null;
  encargadoId: string | null;
  encargadoRel?: { id: string; name: string; rut: string; client: { id: string; name: string } } | null;
  condicionesPago: string | null;
```

Note: we're naming the relation `encargadoRel` on the type to avoid colliding with the existing legacy `encargado` free-text field on line 31. The Prisma field is `encargado` (relation), so the runtime shape is `encargado`, but the TS type uses `encargadoRel?` as an alias to avoid that collision. (The Prisma client returns it as `encargado`; the consumer code uses `encargadoId` to access the FK and may use `encargado?.name` only via Prisma's include — kept optional in the type to avoid breaking consumers that don't include the relation.)

- [ ] **Step 2: Add `encargadoId` to the Zod schema**

In `src/modules/work-orders/validations/workOrderSchemas.ts`, after the existing `encargado` line (line 28), add:

```typescript
  encargadoId: z.string().optional().nullable(),
```

So the block around line 28 becomes:

```typescript
  encargado: z.string().optional().nullable(),
  encargadoId: z.string().optional().nullable(),
```

- [ ] **Step 3: Add `encargadoRef` to the include in the service**

In `src/modules/work-orders/services/workOrderService.ts`, update the `includeRelations` constant (lines 4-7) to:

```typescript
const includeRelations = {
  client: { select: { id: true, name: true } },
  materials: { orderBy: { createdAt: "asc" as const } },
  encargadoRef: {
    select: {
      id: true,
      name: true,
      rut: true,
      client: { select: { id: true, name: true } },
    },
  },
};
```

Note: we use the Prisma field name `encargadoRef` here (matching the schema). The TypeScript type in `workOrder.ts` keeps the optional `encargadoRel` alias name to avoid colliding with the legacy `encargado: string | null` text field on the type.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit --project tsconfig.json 2>&1 | head -40`
Expected: No errors related to the three modified files.

- [ ] **Step 5: Commit**

```bash
cd /Users/francisco/Desktop/metalu
git add src/modules/work-orders/types/workOrder.ts \
        src/modules/work-orders/validations/workOrderSchemas.ts \
        src/modules/work-orders/services/workOrderService.ts
git commit -m "feat(work-orders): add encargadoId field and relation include"
```

---

## Task 13: Modify WorkOrderForm to Use EncargadoSelector

**Files:**
- Modify: `src/modules/work-orders/components/WorkOrderForm.tsx`

This task has the most surface area. We replace the hardcoded `ENCARGADOS` const and `encargado` state with `encargadoId` state, and slot the new `<EncargadoSelector>` in the same place as the old Encargado `<Select>`.

- [ ] **Step 1: Remove the hardcoded ENCARGADOS constant**

In `WorkOrderForm.tsx`, delete lines 27-32 (the entire `ENCARGADOS` array). The new code does not need it.

- [ ] **Step 2: Replace the `encargado` state with `encargadoId` state**

In `WorkOrderForm.tsx` at line 64, change:

```typescript
  const [encargado, setEncargado] = useState("");
```

to:

```typescript
  const [encargadoId, setEncargadoId] = useState<string | null>(null);
  const [encargadoName, setEncargadoName] = useState("");
```

- [ ] **Step 3: Update `resetForm` to reset the new state**

In `WorkOrderForm.tsx`, find the `resetForm` function (around line 105-126). Replace:

```typescript
    setEncargado("");
```

with:

```typescript
    setEncargadoId(null);
    setEncargadoName("");
```

- [ ] **Step 4: Update `handleSave` to include `encargadoId` in the payload**

In `handleSave` (around line 159), replace:

```typescript
        encargado: encargado || null,
```

with:

```typescript
        encargado: encargadoName || null,
        encargadoId: encargadoId || null,
```

- [ ] **Step 5: Add the import for EncargadoSelector**

At the top of the file (next to the other module imports around line 7-8), add:

```typescript
import { EncargadoSelector } from "@/modules/encargados/components/EncargadoSelector";
```

- [ ] **Step 6: Replace the Encargado `<Select>` UI with `<EncargadoSelector>`**

In `WorkOrderForm.tsx`, find the block around lines 372-388 (the old Encargado Select). Replace that block with:

```tsx
            <div>
              <label className="text-[11px] font-semibold uppercase text-gray-600 mb-1 block tracking-wide">
                Encargado
              </label>
              <EncargadoSelector
                value={encargadoId}
                clientId={selectedClient?.id ?? null}
                onChange={(id, enc) => {
                  setEncargadoId(id);
                  setEncargadoName(enc?.name || "");
                }}
              />
            </div>
```

- [ ] **Step 7: Verify the file compiles**

Run: `npx tsc --noEmit --project tsconfig.json 2>&1 | head -40`
Expected: No errors related to `WorkOrderForm.tsx`.

- [ ] **Step 8: Commit**

```bash
cd /Users/francisco/Desktop/metalu
git add src/modules/work-orders/components/WorkOrderForm.tsx
git commit -m "feat(work-orders): replace hardcoded ENCARGADOS with EncargadoSelector"
```

---

## Task 14: Smoke Test in the Browser

**Files:** None (manual verification only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (in another terminal)
Expected: Server boots on `http://localhost:3000`.

- [ ] **Step 2: Open the clients page and click "Ver detalle" on a client**

- Confirm the new "Encargados" section appears between the info cards and the quotations/invoices sections.
- Confirm the "Agregar encargado" button is visible.

- [ ] **Step 3: Create an encargado**

- Click "Agregar encargado", fill all 5 fields (RUT, Nombre, Email, Teléfono, Cargo), save.
- Confirm the row appears in the list with the entered data.

- [ ] **Step 4: Test RUT duplicate**

- Click "Agregar encargado" again with the same RUT but a different name.
- Confirm the inline error shows: "Ya existe un encargado con ese RUT".

- [ ] **Step 5: Edit an encargado**

- Click the pencil icon on a row, change the Cargo, save.
- Confirm the list reflects the change.

- [ ] **Step 6: Toggle active**

- Click the power icon on an active row → confirm dialog appears → confirm → row marks inactive.
- Click the power icon on the inactive row → silently reactivates.

- [ ] **Step 7: Open a work order form for the same client**

- Confirm the new "Encargado" combobox replaces the old hardcoded list.
- Type a partial name → confirm the list filters live.
- Pick an encargado → confirm the legacy `encargado` text field is auto-filled (visually invisible but persisted in the payload).

- [ ] **Step 8: Save the work order and inspect the DB**

- Save the work order.
- Run in another terminal:

```bash
cd /Users/francisco/Desktop/metalu
npx prisma studio
```

- Open the saved work order, confirm the `encargado_id` column is populated.

- [ ] **Step 9: Test delete-safety on the encargado**

- Go back to the client detail → try to delete the encargado (use the API directly or a future button — for now, hit it via `curl` or a temporary button).
- Confirm the API returns 409 with the message "Tiene N trabajo(s) asociado(s), no se puede eliminar".

  > Note: there is no delete button in the current EncargadoListSection per the spec (out of scope). To test the 409 path, hit the API directly:
  >
  > ```bash
  > curl -X DELETE http://localhost:3000/api/encargados/<id> \
  >   -H "Cookie: <your session cookie>"
  > ```
  > Or add a temporary trash icon to the list section for the manual test, then remove it before committing.

- [ ] **Step 10: Auth check**

- Sign out (or hit the API with no cookie):
  ```bash
  curl -i http://localhost:3000/api/encargados
  ```
- Expected: HTTP 401 with `{ "error": "Unauthorized" }`.

- [ ] **Step 11: Final commit (if you made any test-only edits) and push**

```bash
cd /Users/francisco/Desktop/metalu
git status  # should be clean or only contain test-scratch files
git push origin main
```

---

## Self-Review

**1. Spec coverage:**
- ✅ Data model: Encargado model + relations → Tasks 1, 2
- ✅ Backend (API + service): getEncargados, getEncargadoById, createEncargado, updateEncargado, deleteEncargado → Tasks 5, 6, 7
- ✅ Zod validation → Task 4
- ✅ Types → Task 3
- ✅ UI — ClientDetailModal section → Tasks 8, 9, 10
- ✅ UI — WorkOrderForm selector → Tasks 11, 13
- ✅ WorkOrder type/schema/service integration → Task 12
- ✅ Manual test plan → Task 14

**2. Placeholder scan:** No TBDs, no "fill in later" — every step has complete code.

**3. Type consistency:**
- `Encargado` type used in: type file (Task 3), service (Task 5), form (Task 8), list section (Task 9), selector (Task 11), WorkOrder include (Task 12). All consistent.
- `encargadoId` field name used in: WorkOrder type (Task 12), schema (Task 12), service include (Task 12), WorkOrderForm state (Task 13), EncargadoSelector props (Task 11). All consistent.
- `position` field is the Prisma column name (matches the spec); TypeScript type also uses `position`. The original `Cargo` label is UI-only.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-13-client-encargados.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, two-stage review (spec + code quality), fast iteration.
2. **Inline Execution** — batch execution with checkpoints.
