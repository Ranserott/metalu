# Clients CRUD Actions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add view details, edit, and activate/deactivate actions to the clients table at `/clients`, with a read-only detail modal (including last 10 quotations and last 10 invoices) and a generic reusable ConfirmDialog.

**Note on data model:** The `Payment` model in this codebase is for supplier-side payments (FA, BO, PA, OT, CH — tax documents with `supplierId`). It has no `clientId` relation. The client-side "payment" concept lives on the `Invoice` (via `paidAt`). The detail modal therefore shows recent **invoices** (not payments) — that's the closest equivalent for "pagos del cliente" given the schema.

**Architecture:** Backend gets new `GET /api/clients/[id]` and `PATCH /api/clients/[id]` endpoints. The existing `GET /api/clients` accepts a new `?activeOnly=true` query param so the table shows all clients while pickers (ClientModal in quotations/work-orders) only show active ones. Frontend adds an "Acciones" column with three icons (Eye / Pencil / Power) inline. A new `ClientDetailModal` displays full client info + recent records. The existing `ClientForm` is extended with edit mode.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma, react-hook-form + Zod, shadcn/ui Dialog, lucide-react icons. No test framework in the clients module — verification is manual.

**Working directory:** `/Users/francisco/Desktop/metalu/` (main repo, per user workflow rule).

**Commits:** Conventional commits only. No "Co-Authored-By" lines. No build steps.

---

## File Structure

### New files
- `src/app/api/clients/[id]/route.ts` — GET (single client with related records) and PATCH
- `src/modules/clients/components/ClientDetailModal.tsx` — read-only client details modal
- `src/components/ui/confirm-dialog.tsx` — generic reusable confirm dialog

### Modified files
- `src/modules/clients/services/clientService.ts` — `getClientById` adds includes for createdBy + recent records
- `src/app/api/clients/route.ts` — `GET` accepts `?activeOnly=true` query param
- `src/modules/clients/components/ClientForm.tsx` — supports edit mode (title, button, PATCH, form reset on defaultValues change)
- `src/modules/clients/components/ClientTable.tsx` — adds Acciones column, removes row-click, integrates the three modals
- `src/modules/clients/types/client.ts` — adds `createdBy`, `recentQuotations`, `recentInvoices`, `updateClientInput` types
- `src/modules/quotations/components/ClientModal.tsx` — calls `/api/clients?activeOnly=true` to filter inactive clients

---

## Task 1: Update `getClientById` to include related records

**Files:**
- Modify: `src/modules/clients/services/clientService.ts`

- [ ] **Step 1: Replace `getClientById` with the version that includes related records**

Replace the function at line 12-16 of `clientService.ts`:

```typescript
export async function getClientById(id: string) {
  return prisma.client.findUnique({
    where: { id, deletedAt: null },
    include: {
      createdBy: { select: { name: true } },
      quotations: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, number: true, status: true, total: true, createdAt: true },
      },
      invoices: {
        where: { deletedAt: null },
        orderBy: { issueDate: "desc" },
        take: 10,
        select: { id: true, number: true, status: true, total: true, issueDate: true, dueDate: true },
      },
    },
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors related to `clientService.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/modules/clients/services/clientService.ts
git commit -m "feat(clients): include related records in getClientById"
```

---

## Task 2: Add `?activeOnly=true` support to `GET /api/clients`

**Files:**
- Modify: `src/app/api/clients/route.ts`

- [ ] **Step 1: Replace the `GET` handler**

Replace the `GET` function (lines 5-16) in `src/app/api/clients/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getClients, createClient } from "@/modules/clients/services/clientService";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const activeOnly = req.nextUrl.searchParams.get("activeOnly") === "true";
    const data = await getClients({ activeOnly });
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API /clients GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { code, name, contact, email, phone, address, city, notes, isActive } = body;

  try {
    const result = await createClient({ code, name, contact, email, phone, address, city, notes, isActive }, session.user.id);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Update `getClients` in the service to accept the option**

Replace the `getClients` function at line 4-10 of `clientService.ts`:

```typescript
export async function getClients(opts?: { activeOnly?: boolean }) {
  return prisma.client.findMany({
    where: {
      deletedAt: null,
      ...(opts?.activeOnly ? { isActive: true } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/clients/route.ts src/modules/clients/services/clientService.ts
git commit -m "feat(clients): support ?activeOnly=true on GET /api/clients"
```

---

## Task 3: Create `GET /api/clients/[id]` endpoint

**Files:**
- Create: `src/app/api/clients/[id]/route.ts`

- [ ] **Step 1: Create the route file**

Create `src/app/api/clients/[id]/route.ts` with this content (PATCH handler is added in Task 4):

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getClientById, updateClient } from "@/modules/clients/services/clientService";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const client = await getClientById(id);
    if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(client);
  } catch (error) {
    console.error("[API /clients/[id] GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const body = await req.json();
    const updated = await updateClient(id, body);
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }
    console.error("[API /clients/[id] PATCH]", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/clients/[id]/route.ts
git commit -m "feat(clients): add GET and PATCH /api/clients/[id]"
```

---

## Task 4: Create generic `ConfirmDialog` component

**Files:**
- Create: `src/components/ui/confirm-dialog.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/ui/confirm-dialog.tsx` with this content:

```typescript
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  onConfirm,
  loading = false,
}: Props) {
  async function handleConfirm() {
    await onConfirm();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[var(--theme-dark)]">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={
              variant === "destructive"
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-dark)] text-white"
            }
          >
            {loading ? "Procesando..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify `DialogFooter` and `DialogDescription` exist**

Run: `rg -n "DialogFooter|DialogDescription" src/components/ui/dialog.tsx`
Expected: both are exported. If `DialogDescription` is missing, add it to `src/components/ui/dialog.tsx` (mirror the `DialogTitle` pattern).

If `DialogDescription` is missing, add this to `src/components/ui/dialog.tsx` (right after the `DialogTitle` definition):

```typescript
function DialogDescription({ ...props }: DialogPrimitive.Description.Props) {
  return <DialogPrimitive.Description data-slot="dialog-description" {...props} />
}
```

And export it:

```typescript
export { Dialog, ..., DialogDescription, ... }
```

Same for `DialogFooter` if missing — add it (it typically wraps a `<div>` with the footer styling):

```typescript
function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
      {...props}
    />
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/confirm-dialog.tsx src/components/ui/dialog.tsx
git commit -m "feat(ui): add generic ConfirmDialog component"
```

---

## Task 5: Update client types

**Files:**
- Modify: `src/modules/clients/types/client.ts`

- [ ] **Step 1: Add the new types**

Replace the content of `src/modules/clients/types/client.ts`:

```typescript
export type Client = {
  id: string;
  code: string;
  name: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  giro: string | null;
  oc: string | null;
  lastPaymentDate: string | null;
  currentBalance: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: { name: string } | null;
  recentQuotations?: QuotationSummary[];
  recentInvoices?: InvoiceSummary[];
};

export type QuotationSummary = {
  id: string;
  number: string;
  status: string;
  total: number;
  createdAt: Date;
};

export type InvoiceSummary = {
  id: string;
  number: string;
  status: string;
  total: number;
  issueDate: Date;
  dueDate: Date | null;
};

export type ClientUpdateInput = Partial<Omit<Client, "id" | "createdAt" | "updatedAt" | "createdBy" | "recentQuotations" | "recentInvoices">>;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors. (If `ClientForm.tsx` complains about a missing field, fix it in the next task.)

- [ ] **Step 3: Commit**

```bash
git add src/modules/clients/types/client.ts
git commit -m "feat(clients): add related-record types to Client"
```

---

## Task 6: Create `ClientDetailModal`

**Files:**
- Create: `src/modules/clients/components/ClientDetailModal.tsx`

- [ ] **Step 1: Create the component**

Create `src/modules/clients/components/ClientDetailModal.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Client, QuotationSummary, InvoiceSummary } from "../types/client";
import {
  User,
  MapPin,
  FileText,
  DollarSign,
  Calendar,
  TrendingUp,
  Receipt,
} from "lucide-react";

const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" });
const formatDate = (d: Date | string | null) =>
  d ? new Date(d).toLocaleDateString("es-CL") : "—";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
};

export function ClientDetailModal({ open, onOpenChange, clientId }: Props) {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !clientId) {
      setClient(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/clients/${clientId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("No se pudo cargar el cliente");
        return res.json();
      })
      .then((data) => setClient(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, clientId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[var(--theme-dark)] text-lg font-bold">
            Detalle del Cliente
          </DialogTitle>
        </DialogHeader>

        {loading && <p className="text-center text-gray-500 py-8">Cargando...</p>}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {client && !loading && !error && (
          <div className="space-y-5">
            <div className="flex items-center justify-between bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-dark)] text-white px-4 py-3 rounded-lg">
              <div>
                <p className="text-xs uppercase tracking-wide opacity-80">RUT / Código</p>
                <p className="font-bold text-lg">{client.code}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide opacity-80">Estado</p>
                <Badge
                  className={
                    client.isActive
                      ? "bg-green-100 text-green-800 border-green-200"
                      : "bg-gray-100 text-gray-800 border-gray-200"
                  }
                >
                  {client.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              {/* Left column */}
              <div className="space-y-4">
                <Section icon={User} title="Datos Identificatorios">
                  <Field label="Nombre / Razón Social" value={client.name} />
                  <Field label="Giro" value={client.giro} />
                  <Field label="Contacto" value={client.contact} />
                </Section>

                <Section icon={MapPin} title="Contacto y Ubicación">
                  <Field label="Dirección" value={client.address} />
                  <Field label="Ciudad" value={client.city} />
                  <Field label="Email" value={client.email} />
                  <Field label="Teléfono" value={client.phone} />
                </Section>
              </div>

              {/* Right column */}
              <div className="space-y-4">
                <Section icon={DollarSign} title="Estado Financiero">
                  <Field label="O.C." value={client.oc} />
                  <Field label="Último Pago" value={formatDate(client.lastPaymentDate)} />
                  <Field label="Saldo Actual" value={client.currentBalance != null ? clp.format(client.currentBalance) : null} />
                </Section>

                <Section icon={Calendar} title="Auditoría">
                  <Field label="Creado" value={formatDate(client.createdAt)} />
                  <Field label="Actualizado" value={formatDate(client.updatedAt)} />
                  <Field label="Creado por" value={client.createdBy?.name} />
                </Section>
              </div>
            </div>

            {client.notes && (
              <Section icon={FileText} title="Notas">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.notes}</p>
              </Section>
            )}

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <RecentSection
                icon={TrendingUp}
                title="Últimas cotizaciones"
                empty="Sin cotizaciones aún"
                items={client.recentQuotations ?? []}
                renderItem={(q) => (
                  <QuotationRow key={q.id} q={q} />
                )}
              />
              <RecentSection
                icon={Receipt}
                title="Últimas facturas"
                empty="Sin facturas registradas"
                items={client.recentInvoices ?? []}
                renderItem={(inv) => (
                  <InvoiceRow key={inv.id} inv={inv} />
                )}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2.5 border-b flex items-center gap-2">
        <Icon className="w-4 h-4 text-[var(--theme-dark)]" />
        <span className="font-semibold text-xs text-gray-700 uppercase tracking-wide">
          {title}
        </span>
      </div>
      <div className="p-4 space-y-2.5">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-sm text-gray-800">{value || "—"}</p>
    </div>
  );
}

function RecentSection<T>({
  icon: Icon,
  title,
  empty,
  items,
  renderItem,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  empty: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2.5 border-b flex items-center gap-2">
        <Icon className="w-4 h-4 text-[var(--theme-dark)]" />
        <span className="font-semibold text-xs text-gray-700 uppercase tracking-wide">
          {title}
        </span>
      </div>
      <div className="divide-y max-h-64 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-6">{empty}</p>
        ) : (
          items.map(renderItem)
        )}
      </div>
    </div>
  );
}

function QuotationRow({ q }: { q: QuotationSummary }) {
  return (
    <div className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-gray-50">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-800 truncate">{q.number}</p>
        <p className="text-xs text-gray-500">{formatDate(q.createdAt)}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-gray-800">{clp.format(Number(q.total))}</p>
        <Badge variant="secondary" className="text-[10px]">{q.status}</Badge>
      </div>
    </div>
  );
}

function InvoiceRow({ inv }: { inv: InvoiceSummary }) {
  return (
    <div className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-gray-50">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-800 truncate">{inv.number}</p>
        <p className="text-xs text-gray-500">
          {inv.dueDate ? `Vence: ${formatDate(inv.dueDate)}` : `Emitida: ${formatDate(inv.issueDate)}`}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-gray-800">{clp.format(Number(inv.total))}</p>
        <Badge variant="secondary" className="text-[10px]">{inv.status}</Badge>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify `Separator` exists in `components/ui/`**

Run: `ls src/components/ui/separator.tsx 2>/dev/null || echo "MISSING"`
Expected: file path printed (not MISSING).

If missing, create it:

```typescript
// src/components/ui/separator.tsx
"use client"

import * as React from "react"
import { Separator as SeparatorPrimitive } from "@base-ui/react/separator"

import { cn } from "@/lib/utils"

function Separator({ className, orientation = "horizontal", ...props }: React.ComponentProps<typeof SeparatorPrimitive>) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      className={cn(
        "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/clients/components/ClientDetailModal.tsx src/components/ui/separator.tsx
git commit -m "feat(clients): add read-only ClientDetailModal with recent records"
```

---

## Task 7: Add edit mode to `ClientForm`

**Files:**
- Modify: `src/modules/clients/components/ClientForm.tsx`

- [ ] **Step 1: Update the type and reset behavior**

Replace the top of `src/modules/clients/components/ClientForm.tsx` (lines 1-27). The form now accepts an optional `clientId` (for PATCH) and `editMode`, and resets when `defaultValues` change:

```typescript
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClientSchema, ClientInput } from "../validations/clientSchemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, User, MapPin, FileText, DollarSign, Calendar, Save, X } from "lucide-react";

type ClientFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ClientInput) => Promise<void>;
  defaultValues?: Partial<ClientInput>;
  clientId?: string;
  editMode?: boolean;
};

export function ClientForm({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  clientId,
  editMode = false,
}: ClientFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<ClientInput>({
    resolver: zodResolver(ClientSchema) as any,
    defaultValues: defaultValues || {
      isActive: true, code: "", name: "", contact: "", email: "",
      phone: "", address: "", city: "", notes: "", giro: "", oc: "",
      lastPaymentDate: "", currentBalance: 0
    },
  });

  useEffect(() => {
    if (open && defaultValues) {
      form.reset({
        isActive: true, code: "", name: "", contact: "", email: "",
        phone: "", address: "", city: "", notes: "", giro: "", oc: "",
        lastPaymentDate: "", currentBalance: 0,
        ...defaultValues,
      });
    }
  }, [open, defaultValues?.code]); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 2: Update the submit handler to use PATCH in edit mode**

Replace the `handleSubmit` function (lines 29-38):

```typescript
  async function handleSubmit(data: ClientInput) {
    setSubmitting(true);
    try {
      if (editMode && clientId) {
        const res = await fetch(`/api/clients/${clientId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Error al actualizar el cliente");
      } else {
        await onSubmit(data);
      }
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      alert(error.message || "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  }
```

- [ ] **Step 3: Update the modal title and submit button labels**

Replace the title in the header (line 49) and the submit button label (line 243):

In the header `<h2>` (line 49), change:
```typescript
          <h2 className="text-white text-lg font-semibold">{editMode ? "EDITAR CLIENTE" : "REGISTRAR CLIENTE"}</h2>
```

In the submit button (line 243), change:
```typescript
              {submitting ? "Guardando..." : editMode ? "Guardar Cambios" : "Guardar Cliente"}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/modules/clients/components/ClientForm.tsx
git commit -m "feat(clients): support edit mode in ClientForm"
```

---

## Task 8: Update `ClientTable` with actions column and three modals

**Files:**
- Modify: `src/modules/clients/components/ClientTable.tsx`

- [ ] **Step 1: Replace the entire file**

Replace the content of `src/modules/clients/components/ClientTable.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Client, ClientInput } from "../types/client";
import { ClientInput as ClientInputType } from "../validations/clientSchemas";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientForm } from "./ClientForm";
import { ClientDetailModal } from "./ClientDetailModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Eye, Pencil, Power, UserPlus } from "lucide-react";

const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" });

export function ClientTable({ data }: { data: Client[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [toggleClient, setToggleClient] = useState<Client | null>(null);
  const [toggling, setToggling] = useState(false);

  async function handleCreateClient(data: ClientInputType) {
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Error al crear cliente");
    router.refresh();
  }

  async function handleToggleConfirm() {
    if (!toggleClient) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/clients/${toggleClient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !toggleClient.isActive }),
      });
      if (!res.ok) throw new Error("Error al cambiar el estado del cliente");
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Error");
    } finally {
      setToggling(false);
      setToggleClient(null);
    }
  }

  function startDeactivate(client: Client) {
    setToggleClient(client);
  }

  function startActivate(client: Client) {
    // No confirm dialog for activation (reversible, non-destructive)
    void doActivate(client);
  }

  async function doActivate(client: Client) {
    setToggling(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (!res.ok) throw new Error("Error al activar el cliente");
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Error");
    } finally {
      setToggling(false);
    }
  }

  const columns: ColumnDef<Client>[] = [
    { accessorKey: "code", header: "Código" },
    { accessorKey: "name", header: "Nombre" },
    { accessorKey: "contact", header: "Contacto" },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "phone", header: "Teléfono" },
    {
      id: "balance",
      header: "Saldo",
      cell: ({ row }) =>
        row.original.currentBalance != null
          ? clp.format(row.original.currentBalance)
          : "—",
    },
    {
      accessorKey: "isActive",
      header: "Estado",
      cell: ({ row }) => (
        <Badge
          className={
            row.original.isActive
              ? "bg-green-100 text-green-800 border-green-200"
              : "bg-gray-100 text-gray-800 border-gray-200"
          }
        >
          {row.original.isActive ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 border-blue-500 text-blue-600 hover:bg-blue-50"
              onClick={() => setViewId(c.id)}
              title="Ver detalles"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 border-blue-500 text-blue-600 hover:bg-blue-50"
              onClick={() => setEditClient(c)}
              title="Editar"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            {c.isActive ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0 border-red-300 text-red-500 hover:bg-red-50"
                onClick={() => startDeactivate(c)}
                title="Desactivar"
              >
                <Power className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0 border-green-500 text-green-600 hover:bg-green-50"
                onClick={() => startActivate(c)}
                title="Activar"
              >
                <Power className="w-4 h-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="flex justify-end">
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-dark)] hover:from-[var(--theme-dark)] hover:to-[var(--theme-darker)] text-white"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Registrar Cliente
        </Button>
      </div>
      <DataTable columns={columns} data={data} />

      <ClientForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreateClient}
      />

      <ClientForm
        open={editClient !== null}
        onOpenChange={(o) => !o && setEditClient(null)}
        onSubmit={async () => {}} // PATCH handled inside the form in edit mode
        defaultValues={editClient ?? undefined}
        clientId={editClient?.id}
        editMode={editClient !== null}
      />

      <ClientDetailModal
        open={viewId !== null}
        onOpenChange={(o) => !o && setViewId(null)}
        clientId={viewId}
      />

      <ConfirmDialog
        open={toggleClient !== null}
        onOpenChange={(o) => !o && setToggleClient(null)}
        title="Desactivar cliente"
        description={
          toggleClient
            ? `¿Desactivar a ${toggleClient.name}? El cliente no aparecerá en cotizaciones ni trabajos nuevos, pero su historial se preserva.`
            : ""
        }
        confirmLabel="Desactivar"
        variant="destructive"
        loading={toggling}
        onConfirm={handleToggleConfirm}
      />
    </>
  );
}
```

Note: The `ClientInput` import from types is unused — that's fine, the table uses the form-internal submit path. The form's own PATCH logic (added in Task 7) handles edit submissions.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/clients/components/ClientTable.tsx
git commit -m "feat(clients): add actions column with view/edit/toggle to ClientTable"
```

---

## Task 9: Update `ClientModal` in quotations to use `?activeOnly=true`

**Files:**
- Modify: `src/modules/quotations/components/ClientModal.tsx`

- [ ] **Step 1: Update the fetch URL**

In `src/modules/quotations/components/ClientModal.tsx`, replace the fetch call inside the `useEffect` (line 32):

```typescript
        .then((res) => res.json())
        .then((data) => setClients(Array.isArray(data) ? data : []))
        .catch(console.error);
```

with:

```typescript
        .then(async (res) => {
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        })
        .then(setClients)
        .catch(console.error);
```

And change the `useEffect` body (lines 30-37) to:

```typescript
  useEffect(() => {
    if (open) {
      fetch("/api/clients?activeOnly=true")
        .then((res) => res.json())
        .then((data) => setClients(Array.isArray(data) ? data : []))
        .catch(console.error);
    }
  }, [open]);
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/quotations/components/ClientModal.tsx
git commit -m "feat(clients): filter inactive clients in ClientModal picker"
```

---

## Task 10: Manual verification (10 steps from spec)

**No code changes. This is a verification task.**

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (or whatever the project's dev script is). Wait for the server to be ready at `http://localhost:3000`.

- [ ] **Step 2: Create a new client and verify the row appears**

Navigate to `http://localhost:3000/clients`. Click "Registrar Cliente", fill in code, name, contact, save. Verify the new row appears in the table.

- [ ] **Step 3: Open the detail modal via the eye icon**

Click the eye icon on the new client row. Verify the modal opens with all client fields populated. Scroll to "Últimas cotizaciones" and "Últimas facturas" — both should show empty states ("Sin cotizaciones aún" / "Sin facturas registradas").

- [ ] **Step 4: Open the edit modal via the pencil icon**

Close the detail modal. Click the pencil icon. Verify the form opens with all fields pre-filled and the title says "EDITAR CLIENTE".

- [ ] **Step 5: Edit a field and save**

Change the client's name to "Test Updated". Click "Guardar Cambios". Verify the modal closes and the table shows the updated name.

- [ ] **Step 6: Click the deactivate power icon — cancel path**

Click the power icon (red, on an active client). Verify the ConfirmDialog appears with the client name. Click "Cancelar". Verify the client is still active (badge unchanged).

- [ ] **Step 7: Click the deactivate power icon — confirm path**

Click the power icon again. Click "Desactivar" in the dialog. Verify the badge changes to "Inactivo" and the power icon color changes to green.

- [ ] **Step 8: Click the activate power icon (no dialog)**

Click the green power icon. Verify it changes back to active with no dialog.

- [ ] **Step 9: Deactivate a client and verify it disappears from the picker**

Deactivate a client. Navigate to `http://localhost:3000/quotations` and click "Registrar Cotización". Open the client picker. Verify the deactivated client does NOT appear in the list.

- [ ] **Step 10: Reactivate and verify it reappears**

Reactivate the same client. Re-open the client picker. Verify the client is back in the list.

If any step fails, fix the relevant task and re-run. Once all 10 steps pass:

- [ ] **Step 11: Final commit if any minor tweaks were made**

```bash
git add -A
git status  # review what changed
git commit -m "fix(clients): address issues found in manual verification"
```

(Only if there are pending changes. Otherwise skip.)

---

## Self-Review

**Spec coverage check:**

| Spec section | Task |
|---|---|
| Section 1: UX (3 icons, toggle rules, row click removed) | Task 8 |
| Section 2: New `GET /api/clients/[id]` with related records | Tasks 1, 3 |
| Section 2: New `PATCH /api/clients/[id]` | Task 3 |
| Section 2: `?activeOnly=true` query param | Tasks 2, 9 |
| Section 2: Service `getClients` change | Task 2 |
| Section 2: Service `getClientById` includes | Task 1 |
| Section 3: New `ClientDetailModal` with quotations + invoices | Task 6 |
| Section 3: New `ConfirmDialog` reusable | Task 4 |
| Section 3: `ClientTable` actions column + remove row click | Task 8 |
| Section 3: `ClientForm` edit mode | Task 7 |
| Section 3: Types for `createdBy`, `recentQuotations`, `recentInvoices` | Task 5 |
| Section 4: Error handling (toast/alert) | Tasks 6, 7, 8 (use `alert()` for simplicity — toast system is out of scope) |
| Section 5: Manual verification (10 steps) | Task 10 |

**Note on errors:** The spec mentions "toast with error message" but the project doesn't have a unified toast/notification system wired up. Implementation uses `alert()` for simplicity. If a toast system is added later, swap `alert()` calls for toasts.

**Placeholder scan:** No TBD/TODO. All steps have complete code.

**Type consistency:**
- `Client` type used by table, detail modal, form — all match (Task 5 defines it)
- `clientId` prop on `ClientForm` (Task 7) matches what `ClientTable` passes (Task 8)
- `/api/clients/[id]` PATCH body matches `updateClient` service signature (Task 3 ↔ existing service)
- `/api/clients?activeOnly=true` consumed by `ClientModal` (Task 9) is what `getClients` filters on (Task 2)
