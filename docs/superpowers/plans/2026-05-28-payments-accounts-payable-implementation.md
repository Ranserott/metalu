# Accounts Payable — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Accounts Payable module at `/payments` — collapsible accordion form + supplier modal + cancel modal + data table.

**Architecture:** Next.js 15 App Router, Prisma ORM, shadcn/ui components, TanStack Table, React Hook Form + Zod.

**Tech Stack:** Next.js, Prisma, PostgreSQL, shadcn/ui, TanStack Table, React Hook Form, Zod.

---

## File Map

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Add fields to Payment model for AP |
| `src/app/api/payments/route.ts` | GET all, POST new |
| `src/app/api/payments/[id]/route.ts` | GET one, PUT update |
| `src/app/api/payments/[id]/cancel/route.ts` | PATCH cancel with reason |
| `src/app/api/suppliers/route.ts` | GET all suppliers (for modal) |
| `src/modules/payments/types/payment.ts` | AP types |
| `src/modules/payments/validations/paymentSchemas.ts` | Zod schemas |
| `src/modules/payments/services/paymentService.ts` | CRUD + cancel |
| `src/modules/payments/components/PaymentAccordion.tsx` | Collapsible form |
| `src/modules/payments/components/PaymentTable.tsx` | Data grid |
| `src/modules/payments/components/SupplierModal.tsx` | Supplier lookup |
| `src/modules/payments/components/CancelModal.tsx` | Cancel reason |
| `src/app/(dashboard)/payments/page.tsx` | Main page |

---

## Task 1: Update Prisma Schema

**File:** `prisma/schema.prisma`

- [ ] **Step 1: Modify Payment model**

Locate the `Payment` model (line ~349). Replace it with:

```prisma
model Payment {
  id                  String        @id @default(cuid())
  number              String        @unique
  invoiceId           String?       @map("invoice_id")
  supplierId          String?       @map("supplier_id")
  documentType        String?       @map("document_type") // FA, BO, PA, OT, CH
  documentNumber      String?       @map("document_number")
  documentDate        DateTime?     @map("document_date")
  dueDate             DateTime?     @map("due_date")
  amount              Decimal       @db.Decimal(12, 2)
  method              PaymentMethod
  status              String        @default("PENDIENTE") @map("status") // PENDIENTE, PAGADO, CANCELLED
  cancellationReason  String?       @map("cancellation_reason")
  reference           String?
  date                DateTime
  notes               String?
  createdAt           DateTime      @default(now()) @map("created_at")
  updatedAt           DateTime      @updatedAt @map("updated_at")
  deletedAt           DateTime?     @map("deleted_at")
  createdById         String?       @map("created_by_id")

  createdBy User?   @relation("PaymentCreator", fields: [createdById], references: [id])
  invoice   Invoice? @relation(fields: [invoiceId], references: [id])
  supplier  Supplier? @relation(fields: [supplierId], references: [id])

  @@map("payments")
}
```

Also add `payments Payment[]` to the `Supplier` model (after line ~165):
```prisma
  payments Payment[]
```

- [ ] **Step 2: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(payments): extend Payment model for accounts payable"
```

---

## Task 2: Supplier API Route

**Files:** Create `src/app/api/suppliers/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/prisma";

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(suppliers);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/suppliers/route.ts
git commit -m "feat(api): add suppliers list endpoint"
```

---

## Task 3: Update Types and Validations

**Files:**
- Modify: `src/modules/payments/types/payment.ts`
- Modify: `src/modules/payments/validations/paymentSchemas.ts`

- [ ] **Step 1: Update types**

Replace contents of `src/modules/payments/types/payment.ts`:

```typescript
export type SupplierDocument = {
  id: string;
  number: string;
  supplierId: string;
  supplierName?: string;
  supplierCode?: string;
  documentType: "FA" | "BO" | "PA" | "OT" | "CH";
  documentNumber: string;
  documentDate: Date;
  dueDate: Date | null;
  amount: number;
  status: "PENDIENTE" | "PAGADO" | "CANCELLED";
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};
```

- [ ] **Step 2: Update validations**

Replace contents of `src/modules/payments/validations/paymentSchemas.ts`:

```typescript
import { z } from "zod";

export const DOCUMENT_TYPES = ["FA", "BO", "PA", "OT", "CH"] as const;
export const PAYMENT_STATUSES = ["PENDIENTE", "PAGADO", "CANCELLED"] as const;

export const SupplierDocumentSchema = z.object({
  supplierId: z.string().min(1, "Proveedor requerido"),
  documentType: z.enum(DOCUMENT_TYPES, { required_error: "Tipo de documento requerido" }),
  documentNumber: z.string().min(1, "N° de documento requerido"),
  documentDate: z.date({ required_error: "Fecha de documento requerida" }),
  dueDate: z.date().optional().nullable(),
  amount: z.number().positive("El valor debe ser mayor a 0"),
  status: z.enum(PAYMENT_STATUSES).default("PENDIENTE"),
  cancellationReason: z.string().optional(),
});

export const CancelDocumentSchema = z.object({
  cancellationReason: z.string().min(1, "Motivo de cancelación requerido"),
});

export type SupplierDocumentInput = z.infer<typeof SupplierDocumentSchema>;
export type CancelDocumentInput = z.infer<typeof CancelDocumentSchema>;
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/payments/types/payment.ts src/modules/payments/validations/paymentSchemas.ts
git commit -m "feat(payments): update types and validations for accounts payable"
```

---

## Task 4: Update Payment Service

**File:** `src/modules/payments/services/paymentService.ts`

- [ ] **Step 1: Replace with AP service**

```typescript
import { prisma } from "@/lib/prisma/prisma";
import { SupplierDocumentInput } from "../validations/paymentSchemas";

export type SupplierDocument = {
  id: string;
  number: string;
  supplierId: string | null;
  supplier: { id: string; code: string; name: string } | null;
  documentType: string | null;
  documentNumber: string | null;
  documentDate: Date | null;
  dueDate: Date | null;
  amount: import("@prisma/client/runtime/library").Decimal;
  status: string;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function getSupplierDocuments() {
  return await prisma.payment.findMany({
    where: {
      deletedAt: null,
      supplierId: { not: null },
    },
    include: { supplier: { select: { id: true, code: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSupplierDocumentById(id: string) {
  return await prisma.payment.findUnique({
    where: { id, deletedAt: null },
    include: { supplier: { select: { id: true, code: true, name: true } } },
  });
}

export async function createSupplierDocument(data: SupplierDocumentInput & { number: string }, userId: string) {
  return await prisma.payment.create({
    data: {
      ...data,
      date: data.documentDate,
      createdById: userId,
    },
  });
}

export async function updateSupplierDocument(id: string, data: Partial<SupplierDocumentInput>) {
  const updateData: any = { ...data };
  if (data.documentDate) updateData.date = data.documentDate;
  delete updateData.documentDate;

  return await prisma.payment.update({
    where: { id },
    data: updateData,
  });
}

export async function cancelSupplierDocument(id: string, cancellationReason: string) {
  return await prisma.payment.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancellationReason,
    },
  });
}

export async function generateDocumentNumber() {
  const count = await prisma.payment.count({
    where: { supplierId: { not: null } },
  });
  return `AP-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/payments/services/paymentService.ts
git commit -m "feat(services): add supplier document CRUD operations"
```

---

## Task 5: Create API Routes

**Files:**
- Create: `src/app/api/payments/route.ts`
- Create: `src/app/api/payments/[id]/route.ts`
- Create: `src/app/api/payments/[id]/cancel/route.ts`

- [ ] **Step 1: Main payments route** `src/app/api/payments/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { auth } from "@/lib/auth/auth";
import { getSupplierDocuments, createSupplierDocument, generateDocumentNumber } from "@/modules/payments/services/paymentService";
import { SupplierDocumentSchema } from "@/modules/payments/validations/paymentSchemas";

export async function GET() {
  const data = await getSupplierDocuments();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = SupplierDocumentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }

  const number = await generateDocumentNumber();
  const result = await createSupplierDocument({ ...parsed.data, number }, session.user.id);

  return NextResponse.json(result, { status: 201 });
}
```

- [ ] **Step 2: Single payment route** `src/app/api/payments/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getSupplierDocumentById, updateSupplierDocument } from "@/modules/payments/services/paymentService";
import { SupplierDocumentSchema } from "@/modules/payments/validations/paymentSchemas";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await getSupplierDocumentById(id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doc);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = SupplierDocumentSchema.partial().safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }

  const result = await updateSupplierDocument(id, parsed.data);
  return NextResponse.json(result);
}
```

- [ ] **Step 3: Cancel route** `src/app/api/payments/[id]/cancel/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { cancelSupplierDocument } from "@/modules/payments/services/paymentService";
import { CancelDocumentSchema } from "@/modules/payments/validations/paymentSchemas";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = CancelDocumentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }

  const result = await cancelSupplierDocument(id, parsed.data.cancellationReason);
  return NextResponse.json(result);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/payments/route.ts src/app/api/payments/[id]/route.ts src/app/api/payments/[id]/cancel/route.ts
git commit -m "feat(api): add payments REST endpoints"
```

---

## Task 6: Create SupplierModal Component

**File:** Create `src/modules/payments/components/SupplierModal.tsx`

- [ ] **Step 1: Create the component**

```typescript
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Supplier = { id: string; code: string; name: string };

type SupplierModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (supplier: Supplier) => void;
};

export function SupplierModal({ open, onOpenChange, onSelect }: SupplierModalProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchSuppliers();
    }
  }, [open]);

  async function fetchSuppliers() {
    setLoading(true);
    try {
      const res = await fetch("/api/suppliers");
      const data = await res.json();
      setSuppliers(data);
    } finally {
      setLoading(false);
    }
  }

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Seleccionar Proveedor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Buscar por nombre o RUT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-64 overflow-y-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>RUT</TableHead>
                  <TableHead>Nombre</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-4">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-4">
                      No se encontraron proveedores
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((supplier) => (
                    <TableRow
                      key={supplier.id}
                      className="cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        onSelect(supplier);
                        onOpenChange(false);
                        setSearch("");
                      }}
                    >
                      <TableCell className="font-mono text-sm">{supplier.code}</TableCell>
                      <TableCell>{supplier.name}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/payments/components/SupplierModal.tsx
git commit -m "feat(payments): add supplier selection modal"
```

---

## Task 7: Create CancelModal Component

**File:** Create `src/modules/payments/components/CancelModal.tsx`

- [ ] **Step 1: Create the component**

```typescript
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CancelDocumentSchema } from "../validations/paymentSchemas";

type CancelModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
};

export function CancelModal({ open, onOpenChange, onConfirm }: CancelModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    const parsed = CancelDocumentSchema.safeParse({ cancellationReason: reason });
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      await onConfirm(reason);
      setReason("");
      setError("");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  function handleClose(open: boolean) {
    if (!open) {
      setReason("");
      setError("");
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar Documento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Motivo de cancelación
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ingrese el motivo..."
              rows={3}
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => handleClose(false)}>
              Volver
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
              {loading ? "Cancelando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/payments/components/CancelModal.tsx
git commit -m "feat(payments): add cancel document modal"
```

---

## Task 8: Create PaymentAccordion Component

**File:** Create `src/modules/payments/components/PaymentAccordion.tsx`

- [ ] **Step 1: Create the component**

```typescript
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SupplierDocumentSchema, SupplierDocumentInput, DOCUMENT_TYPES, PAYMENT_STATUSES } from "../validations/paymentSchemas";
import { SupplierModal } from "./SupplierModal";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, Eraser, Save } from "lucide-react";

type Props = {
  onSuccess?: () => void;
  editData?: SupplierDocumentInput & { id: string };
  onEditClear?: () => void;
};

export function PaymentAccordion({ onSuccess, editData, onEditClear }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<SupplierDocumentInput>({
    resolver: zodResolver(SupplierDocumentSchema),
    defaultValues: {
      documentDate: new Date(),
      status: "PENDIENTE",
      ...editData,
    },
  });

  const selectedSupplier = form.watch("supplierId");

  async function onSubmit(data: SupplierDocumentInput) {
    setSubmitting(true);
    try {
      const url = editData ? `/api/payments/${editData.id}` : "/api/payments";
      const method = editData ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Error saving");

      form.reset({
        documentDate: new Date(),
        status: "PENDIENTE",
      });
      onSuccess?.();
      if (editData) onEditClear?.();
    } finally {
      setSubmitting(false);
    }
  }

  function handleSupplierSelect(supplier: { id: string; code: string; name: string }) {
    form.setValue("supplierId", supplier.id);
  }

  function handleClean() {
    form.reset({ documentDate: new Date(), status: "PENDIENTE" });
    if (editData) onEditClear?.();
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <span className="font-medium">
          {editData ? "MODIFICAR DOCUMENTO" : "INGRESAR DOCUMENTO"}
        </span>
      </button>

      {/* Form */}
      {expanded && (
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* RUT + Name */}
            <div className="col-span-2 grid grid-cols-3 gap-2 items-end">
              <div className="col-span-2">
                <FormField
                  label="RUT Proveedor"
                  {...form.register("supplierId")}
                  error={form.formState.errors.supplierId?.message}
                  readOnly
                  placeholder="Seleccione un proveedor..."
                  value={selectedSupplier || ""}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSupplierModalOpen(true)}
              >
                ...
              </Button>
            </div>

            {/* Tipo + N° Doc */}
            <div>
              <label className="text-sm font-medium mb-1 block">Tipo Documento</label>
              <Select
                value={form.watch("documentType")}
                onValueChange={(v) => form.setValue("documentType", v as SupplierDocumentInput["documentType"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione..." />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.documentType && (
                <p className="text-red-500 text-xs mt-1">
                  {form.formState.errors.documentType.message}
                </p>
              )}
            </div>

            <FormField
              label="N° Documento"
              {...form.register("documentNumber")}
              error={form.formState.errors.documentNumber?.message}
            />

            {/* Fecha Doc + Valor */}
            <FormField
              label="Fecha Documento"
              type="date"
              {...form.register("documentDate", { valueAsDate: true })}
              error={form.formState.errors.documentDate?.message}
            />

            <FormField
              label="Valor"
              type="number"
              step="0.01"
              {...form.register("amount", { valueAsNumber: true })}
              error={form.formState.errors.amount?.message}
            />

            {/* Fecha Venc + Estado */}
            <FormField
              label="Fecha Vencimiento"
              type="date"
              {...form.register("dueDate", { valueAsDate: true })}
              error={form.formState.errors.dueDate?.message}
            />

            <div>
              <label className="text-sm font-medium mb-1 block">Estado</label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) => form.setValue("status", v as SupplierDocumentInput["status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={handleClean}>
              <Eraser className="w-4 h-4 mr-1" />
              LIMPIAR
            </Button>
            <Button type="submit" disabled={submitting}>
              <Save className="w-4 h-4 mr-1" />
              {submitting ? "GRABANDO..." : "GRABAR"}
            </Button>
          </div>
        </form>
      )}

      <SupplierModal
        open={supplierModalOpen}
        onOpenChange={setSupplierModalOpen}
        onSelect={handleSupplierSelect}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/payments/components/PaymentAccordion.tsx
git commit -m "feat(payments): add collapsible payment form"
```

---

## Task 9: Update PaymentTable Component

**File:** `src/modules/payments/components/PaymentTable.tsx`

- [ ] **Step 1: Replace with AP table**

```typescript
"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, X } from "lucide-react";
import { CancelModal } from "./CancelModal";

type SupplierDocumentRow = {
  id: string;
  number: string;
  supplier: { code: string; name: string } | null;
  documentType: string | null;
  documentNumber: string | null;
  documentDate: Date | null;
  amount: number;
  dueDate: Date | null;
  status: string;
};

type Props = {
  data: SupplierDocumentRow[];
  onEdit: (doc: SupplierDocumentRow) => void;
  onCancelSuccess: () => void;
};

const statusColors: Record<string, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-800",
  PAGADO: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export function PaymentTable({ data, onEdit, onCancelSuccess }: Props) {
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<SupplierDocumentRow | null>(null);

  const columns: ColumnDef<SupplierDocumentRow>[] = [
    {
      accessorKey: "supplier",
      header: "RUT",
      cell: ({ row }) => row.original.supplier?.code ?? "—",
    },
    {
      accessorKey: "supplier",
      header: "Nombre",
      cell: ({ row }) => row.original.supplier?.name ?? "—",
    },
    {
      accessorKey: "documentType",
      header: "Tipo",
    },
    {
      accessorKey: "documentNumber",
      header: "N° Doc",
    },
    {
      accessorKey: "documentDate",
      header: "Fecha",
      cell: ({ row }) =>
        row.original.documentDate
          ? new Date(row.original.documentDate).toLocaleDateString()
          : "—",
    },
    {
      accessorKey: "amount",
      header: "Valor",
      cell: ({ row }) =>
        new Intl.NumberFormat("es-CL", {
          style: "currency",
          currency: "CLP",
        }).format(Number(row.original.amount)),
    },
    {
      accessorKey: "dueDate",
      header: "Vencimiento",
      cell: ({ row }) =>
        row.original.dueDate
          ? new Date(row.original.dueDate).toLocaleDateString()
          : "—",
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => (
        <Badge className={statusColors[row.original.status] ?? ""}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(row.original)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          {row.original.status !== "CANCELLED" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedDoc(row.original);
                setCancelModalOpen(true);
              }}
            >
              <X className="w-4 h-4 text-red-500" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  async function handleCancel(reason: string) {
    if (!selectedDoc) return;
    const res = await fetch(`/api/payments/${selectedDoc.id}/cancel`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancellationReason: reason }),
    });
    if (res.ok) {
      onCancelSuccess();
    }
  }

  return (
    <>
      <DataTable columns={columns} data={data} />
      <CancelModal
        open={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        onConfirm={handleCancel}
      />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/payments/components/PaymentTable.tsx
git commit -m "feat(payments): update table with AP columns and actions"
```

---

## Task 10: Update Payments Page

**File:** `src/app/(dashboard)/payments/page.tsx`

- [ ] **Step 1: Replace page**

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { PaymentAccordion } from "@/modules/payments/components/PaymentAccordion";
import { PaymentTable } from "@/modules/payments/components/PaymentTable";
import { SupplierDocumentInput } from "@/modules/payments/validations/paymentSchemas";

type SupplierDocumentRow = {
  id: string;
  number: string;
  supplier: { code: string; name: string } | null;
  documentType: string | null;
  documentNumber: string | null;
  documentDate: Date | null;
  amount: number;
  dueDate: Date | null;
  status: string;
};

export default function PaymentsPage() {
  const [documents, setDocuments] = useState<SupplierDocumentRow[]>([]);
  const [editData, setEditData] = useState<SupplierDocumentInput & { id: string } | undefined>();

  const fetchDocuments = useCallback(async () => {
    const res = await fetch("/api/payments");
    if (res.ok) {
      const data = await res.json();
      setDocuments(data);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  function handleEdit(doc: SupplierDocumentRow) {
    setEditData({
      id: doc.id,
      supplierId: doc.supplier?.code ?? "",
      documentType: doc.documentType as SupplierDocumentInput["documentType"],
      documentNumber: doc.documentNumber ?? "",
      documentDate: doc.documentDate ? new Date(doc.documentDate) : new Date(),
      amount: Number(doc.amount),
      dueDate: doc.dueDate ? new Date(doc.dueDate) : null,
      status: doc.status as SupplierDocumentInput["status"],
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Pagos</h1>
          <p className="text-sm text-gray-500">Accounts Payable — Documentos de Proveedores</p>
        </div>
      </div>

      <PaymentAccordion
        onSuccess={fetchDocuments}
        editData={editData}
        onEditClear={() => setEditData(undefined)}
      />

      <div className="border rounded-lg overflow-hidden">
        <PaymentTable
          data={documents}
          onEdit={handleEdit}
          onCancelSuccess={fetchDocuments}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/payments/page.tsx
git commit -m "feat(payments): update page with accordion form and table"
```

---

## Task 11: Verify and Test

- [ ] **Step 1: Run Prisma**

```bash
npx prisma db push
```

- [ ] **Step 2: Start dev server and test**

```bash
npm run dev -- --port 3000
```

Navigate to `http://localhost:3000/payments` and verify:
1. Accordion bar is visible and expands on click
2. Form has all fields: RUT (with ... button), Tipo Doc, N° Doc, Fecha Doc, Valor, Fecha Venc, Estado
3. Clicking "..." opens supplier modal with search
4. Selecting a supplier fills the RUT field
5. GRABAR saves the document
6. Table shows the saved document
7. Edit button loads document into form
8. Cancel button opens cancel modal
9. After cancel, status shows CANCELLED

---

## Self-Review Checklist

- [ ] All spec requirements covered: accordion, supplier modal, cancel modal, table with actions
- [ ] All document types: FA, BO, PA, OT, CH
- [ ] All statuses: PENDIENTE, PAGADO, CANCELLED
- [ ] Motivo de cancelación required
- [ ] Supplier search by name or RUT
- [ ] Edit always available
- [ ] GRABAR stays in form
- [ ] No placeholder/TBD in steps
