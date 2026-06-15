# Purchase Request (Solicitud de Orden de Compra) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 3-step approval workflow (Solicitud Generada → En Revisión → Orden Emitida) that lets users request a Purchase Order from a Work Order, get it reviewed by an admin, and materialize a real `Purchase` record on approval.

**Architecture:** New `SolicitudOrdenCompra` entity with workflow status enum. Admin reviews + adds supplier/items in paso 2. On `approve` action, a `Purchase` record is created in a single Prisma transaction. UI uses tabs in `/purchases` (Emitidas + Solicitudes) with a dedicated form at `/purchases/solicitudes/new` matching the design mockup.

**Tech Stack:** Next.js 15 (App Router, async params), Prisma 7.8 (`engineType = "library"`, output at `src/generated/prisma/`), Zod, shadcn/ui (Tabs, Dialog, Card, Input, Button, Select, Badge, Textarea, Calendar/DatePicker), plain `useState` (matches EncargadoForm pattern).

**Workflow rules:**
- All work happens in **MAIN repo** at `/Users/francisco/Desktop/metalu/`, NOT the worktree.
- Conventional commits, NEVER add `Co-Authored-By` or AI attribution.
- NEVER run `npm run build` after changes.
- After every `prisma generate` or `prisma migrate dev`, **remind the user to restart the dev server** — Next.js caches the Prisma client in memory and hot-reload does not pick up `src/generated/prisma/` changes.
- Use `npx tsc --noEmit` to typecheck, NOT `npm run build`.

---

## File Map

**New files (15):**

| Path | Responsibility |
| --- | --- |
| `prisma/migrations/{timestamp}_add_solicitudes_orden_compra/migration.sql` | Schema changes (auto-generated) |
| `src/modules/solicitudes/types/solicitud.ts` | TypeScript types: `SolicitudOrdenCompra`, `SolicitudItem` |
| `src/modules/solicitudes/validations/solicitudSchemas.ts` | Zod schemas: `SolicitudSchema`, `SolicitudReviewSchema`, `SolicitudTransitionSchema` |
| `src/modules/solicitudes/services/solicitudService.ts` | 6 service functions (CRUD + transitions with side effects) |
| `src/app/api/solicitudes/route.ts` | GET (list) + POST (create) |
| `src/app/api/solicitudes/[id]/route.ts` | GET (one) + PATCH (edit) + DELETE (soft) |
| `src/app/api/solicitudes/[id]/transitions/route.ts` | POST (state machine actions) |
| `src/modules/solicitudes/components/SolicitudForm.tsx` | Paso 1 form (the design mockup) |
| `src/modules/solicitudes/components/SolicitudReviewForm.tsx` | Paso 2 review form (admin) |
| `src/modules/solicitudes/components/SolicitudItemsTable.tsx` | Editable items table for review |
| `src/modules/solicitudes/components/SolicitudesTable.tsx` | Table for the Solicitudes tab |
| `src/modules/solicitudes/components/SolicitudDetailView.tsx` | Full detail view (read paso 1 + edit paso 2) |
| `src/modules/solicitudes/components/TransitionDialogs.tsx` | Reject/Cancel/Approve confirm dialogs |
| `src/app/(dashboard)/purchases/solicitudes/new/page.tsx` | Page hosting `SolicitudForm` |
| `src/app/(dashboard)/purchases/solicitudes/[id]/page.tsx` | Page hosting `SolicitudDetailView` |

**Modified files (4):**

| Path | Change |
| --- | --- |
| `prisma/schema.prisma` | Add `SolicitudOrdenCompra`, `SolicitudItem`, 2 enums; add relations to existing models |
| `src/app/(dashboard)/purchases/page.tsx` | Add Tabs (Emitidas + Solicitudes) + "Nueva orden de compra" button |
| `src/modules/purchases/services/purchaseService.ts` | Remove mock-data `try/catch` fallbacks |
| `src/modules/work-orders/components/WorkOrderDetailModal.tsx` | Add "Purchase Requests" section |

---

## Task 1: Prisma Schema — Add SolicitudOrdenCompra, SolicitudItem, Enums, and Relations

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the new models and enums to `prisma/schema.prisma`**

Open the file and add the following blocks.

After the existing `Encargado` model (around line 131) and BEFORE the `Quotation` model, insert:

```prisma
model SolicitudOrdenCompra {
  id              String                  @id @default(uuid())
  number          String                  @unique
  workOrderId     String                  @map("work_order_id")
  clientId        String                  @map("client_id")
  fechaTrabajo    DateTime                @map("fecha_trabajo")
  fechaEntrega    DateTime                @map("fecha_entrega")
  diasSinOC       Int                     @default(0) @map("dias_sin_oc")
  solicitud1      DateTime?               @map("solicitud_1")
  solicitud2      DateTime?               @map("solicitud_2")
  solicitud3      DateTime?               @map("solicitud_3")
  notasInternas   String?                 @map("notas_internas")
  status          SolicitudStatus         @default(SOLICITUD_GENERADA)
  purchaseId      String?                 @unique @map("purchase_id")
  createdAt       DateTime                @default(now()) @map("created_at")
  updatedAt       DateTime                @updatedAt @map("updated_at")
  deletedAt       DateTime?               @map("deleted_at")
  createdById     String?                 @map("created_by_id")

  // Review fields (paso 2 — admin)
  supplierId       String?                 @map("supplier_id")
  subtotal         Decimal?                @db.Decimal(12, 2)
  tax              Decimal?                @db.Decimal(12, 2)
  total            Decimal?                @db.Decimal(12, 2)
  discount         Decimal?                @default(0) @db.Decimal(12, 2)
  discountType     SolicitudDiscountType?  @default(NONE) @map("discount_type")

  // Rejection fields
  rejectionReason String?   @map("rejection_reason")
  rejectedById    String?   @map("rejected_by_id")
  rejectedAt      DateTime? @map("rejected_at")

  workOrder WorkOrder              @relation(fields: [workOrderId], references: [id], onDelete: Restrict)
  client    Client                 @relation(fields: [clientId], references: [id], onDelete: Restrict)
  supplier  Supplier?              @relation(fields: [supplierId], references: [id], onDelete: SetNull)
  purchase  Purchase?              @relation("SolicitudPurchase", fields: [purchaseId], references: [id], onDelete: SetNull)
  createdBy User?                  @relation("SolicitudCreator", fields: [createdById], references: [id])
  rejectedBy User?                 @relation("SolicitudRejecter", fields: [rejectedById], references: [id])
  items     SolicitudItem[]

  @@map("solicitudes_orden_compra")
}

model SolicitudItem {
  id          String    @id @default(uuid())
  solicitudId String    @map("solicitud_id")
  description String
  quantity    Decimal   @db.Decimal(10, 2)
  unitPrice   Decimal   @db.Decimal(10, 2)
  total       Decimal   @db.Decimal(12, 2)
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  solicitud SolicitudOrdenCompra @relation(fields: [solicitudId], references: [id], onDelete: Cascade)

  @@map("solicitud_items")
}

enum SolicitudStatus {
  SOLICITUD_GENERADA
  EN_REVISION
  ORDEN_EMITIDA
  RECHAZADA
  CANCELADA
}

enum SolicitudDiscountType {
  NONE
  AMOUNT
  PERCENT
}
```

- [ ] **Step 2: Add back-relations on existing models**

In the `User` model (around line 13-43), inside the inverse relations block, add:
```prisma
  createdSolicitudes  SolicitudOrdenCompra[] @relation("SolicitudCreator")
  rejectedSolicitudes SolicitudOrdenCompra[] @relation("SolicitudRejecter")
```

In the `Client` model (around line 83-110), add (next to the existing `encargados Encargado[]` line):
```prisma
  solicitudesOC SolicitudOrdenCompra[]
```

In the `WorkOrder` model (around line 215-268), add (near the end of the field block, next to `encargadoRef`):
```prisma
  solicitudesOC  SolicitudOrdenCompra[]
```

In the `Purchase` model (around line 368-395), add:
```prisma
  solicitud SolicitudOrdenCompra? @relation("SolicitudPurchase")
```

In the `Supplier` model (around line 193-213), add:
```prisma
  solicitudes SolicitudOrdenCompra[]
```

- [ ] **Step 3: Run the migration**

Run from `/Users/francisco/Desktop/metalu/`:
```bash
npx prisma migrate dev --name add_solicitudes_orden_compra
```

Expected: Prisma creates `prisma/migrations/{timestamp}_add_solicitudes_orden_compra/migration.sql` with the new tables and FKs. The CLI also runs `prisma generate` automatically.

- [ ] **Step 4: Verify the generated client includes the new types**

Run:
```bash
rg "SolicitudOrdenCompraDelegate" /Users/francisco/Desktop/metalu/src/generated/prisma/index.d.ts
```

Expected: 1 match. If 0 matches, the migration didn't run or `prisma generate` failed.

- [ ] **Step 5: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add prisma/schema.prisma prisma/migrations/
git -C /Users/francisco/Desktop/metalu commit -m "feat(purchases): add SolicitudOrdenCompra and SolicitudItem models

New entity for the purchase request workflow. 3-step approval
(Solicitud Generada -> En Revision -> Orden Emitida) with rejection
and cancellation side-states. Linked to WorkOrder, Client, Supplier,
and Purchase (1:1 unique on purchaseId)."
```

> **DEV SERVER REMINDER:** After this task, the user must restart the dev server. Next.js caches the Prisma client in memory and hot-reload does not pick up `src/generated/prisma/` changes. Remind them to run `Ctrl+C` then `npm run dev` (or `pnpm dev` / `yarn dev`).

---

## Task 2: Create TypeScript Types

**Files:**
- Create: `src/modules/solicitudes/types/solicitud.ts`

- [ ] **Step 1: Create the types file**

Write to `src/modules/solicitudes/types/solicitud.ts`:

```ts
export type SolicitudStatus =
  | "SOLICITUD_GENERADA"
  | "EN_REVISION"
  | "ORDEN_EMITIDA"
  | "RECHAZADA"
  | "CANCELADA";

export type SolicitudDiscountType = "NONE" | "AMOUNT" | "PERCENT";

export type SolicitudItem = {
  id: string;
  solicitudId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
};

export type SolicitudOrdenCompra = {
  id: string;
  number: string;
  workOrderId: string;
  workOrder: { number: string; title: string };
  clientId: string;
  client: { name: string; code: string };
  fechaTrabajo: Date;
  fechaEntrega: Date;
  diasSinOC: number;
  solicitud1: Date | null;
  solicitud2: Date | null;
  solicitud3: Date | null;
  notasInternas: string | null;
  status: SolicitudStatus;
  supplierId: string | null;
  supplier: { name: string } | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  discount: number | null;
  discountType: SolicitudDiscountType | null;
  purchaseId: string | null;
  rejectionReason: string | null;
  rejectedById: string | null;
  rejectedAt: Date | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: SolicitudItem[];
};

export type SolicitudOrdenCompraListItem = Omit<
  SolicitudOrdenCompra,
  "items"
> & {
  _count?: { items: number };
};
```

- [ ] **Step 2: Verify the file compiles**

Run:
```bash
cd /Users/francisco/Desktop/metalu && npx tsc --noEmit src/modules/solicitudes/types/solicitud.ts 2>&1 | head -20
```

Expected: no errors. (If `tsc` complains about a missing module in this single-file mode, that is OK — typecheck the full project in Step 3.)

- [ ] **Step 3: Full project typecheck**

Run:
```bash
cd /Users/francisco/Desktop/metalu && npx tsc --noEmit 2>&1 | tail -20
```

Expected: no new errors related to `solicitud.ts`. Pre-existing errors in other modules are OK; only verify the new file does not introduce regressions.

- [ ] **Step 4: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add src/modules/solicitudes/types/solicitud.ts
git -C /Users/francisco/Desktop/metalu commit -m "feat(purchases): add Solicitud TypeScript types"
```

---

## Task 3: Create Zod Validation Schemas

**Files:**
- Create: `src/modules/solicitudes/validations/solicitudSchemas.ts`

- [ ] **Step 1: Create the schemas file**

Write to `src/modules/solicitudes/validations/solicitudSchemas.ts`:

```ts
import { z } from "zod";

// Paso 1 — used on POST and on PATCH when status = SOLICITUD_GENERADA
export const SolicitudSchema = z.object({
  workOrderId: z.string().min(1, "Trabajo requerido"),
  clientId: z.string().min(1, "Cliente requerido"),
  fechaTrabajo: z.coerce.date(),
  fechaEntrega: z.coerce.date(),
  diasSinOC: z.number().int().min(0).optional(),
  solicitud1: z.coerce.date().optional().nullable(),
  solicitud2: z.coerce.date().optional().nullable(),
  solicitud3: z.coerce.date().optional().nullable(),
  notasInternas: z.string().optional(),
});

export type SolicitudInput = z.infer<typeof SolicitudSchema>;

// Paso 2 — used on PATCH when status = EN_REVISION
export const SolicitudReviewSchema = z.object({
  supplierId: z.string().min(1, "Proveedor requerido"),
  items: z
    .array(
      z.object({
        description: z.string().min(1, "Descripción requerida"),
        quantity: z.coerce.number().positive("Cantidad debe ser positiva"),
        unitPrice: z.coerce.number().nonnegative("Precio debe ser ≥ 0"),
      })
    )
    .min(1, "Al menos un item requerido"),
  discount: z.coerce.number().nonnegative().optional(),
  discountType: z.enum(["NONE", "AMOUNT", "PERCENT"]).optional(),
});

export type SolicitudReviewInput = z.infer<typeof SolicitudReviewSchema>;

// Transitions endpoint
export const SolicitudTransitionSchema = z.object({
  action: z.enum(["submit", "approve", "reject", "cancel"]),
  reason: z.string().optional(),
});

export type SolicitudTransitionInput = z.infer<typeof SolicitudTransitionSchema>;
```

- [ ] **Step 2: Typecheck**

Run:
```bash
cd /Users/francisco/Desktop/metalu && npx tsc --noEmit 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add src/modules/solicitudes/validations/solicitudSchemas.ts
git -C /Users/francisco/Desktop/metalu commit -m "feat(purchases): add Solicitud Zod validation schemas"
```

---

## Task 4: Create Solicitud Service Layer

**Files:**
- Create: `src/modules/solicitudes/services/solicitudService.ts`

- [ ] **Step 1: Create the service file**

Write to `src/modules/solicitudes/services/solicitudService.ts`:

```ts
import { prisma } from "@/lib/prisma/prisma";
import {
  SolicitudInput,
  SolicitudReviewInput,
  SolicitudStatus,
} from "../types/solicitud";

const TAX_RATE = 0.19; // IVA Chile

const INCLUDE_BASE = {
  workOrder: { select: { number: true, title: true } },
  client: { select: { name: true, code: true } },
  supplier: { select: { name: true } },
};

const INCLUDE_FULL = {
  ...INCLUDE_BASE,
  items: { where: { deletedAt: null }, orderBy: { createdAt: "asc" as const } },
};

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

async function nextSolicitudNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SOL-${year}-`;
  const last = await prisma.solicitudOrdenCompra.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
  });
  const lastSeq = last ? parseInt(last.number.slice(prefix.length), 10) : 0;
  return `${prefix}${String(lastSeq + 1).padStart(3, "0")}`;
}

async function nextPurchaseNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `OC-${year}-`;
  const last = await prisma.purchase.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
  });
  const lastSeq = last ? parseInt(last.number.slice(prefix.length), 10) : 0;
  return `${prefix}${String(lastSeq + 1).padStart(3, "0")}`;
}

export async function getSolicitudes(opts: { status?: SolicitudStatus; workOrderId?: string } = {}) {
  return prisma.solicitudOrdenCompra.findMany({
    where: {
      deletedAt: null,
      ...(opts.status && { status: opts.status }),
      ...(opts.workOrderId && { workOrderId: opts.workOrderId }),
    },
    include: {
      ...INCLUDE_BASE,
      _count: { select: { items: { where: { deletedAt: null } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSolicitudById(id: string) {
  return prisma.solicitudOrdenCompra.findFirst({
    where: { id, deletedAt: null },
    include: INCLUDE_FULL,
  });
}

export async function createSolicitud(data: SolicitudInput, userId: string) {
  // Validate workOrder and client exist and are not soft-deleted
  const wo = await prisma.workOrder.findFirst({
    where: { id: data.workOrderId, deletedAt: null },
  });
  if (!wo) throw new Error("Trabajo no encontrado");

  const client = await prisma.client.findFirst({
    where: { id: data.clientId, deletedAt: null },
  });
  if (!client) throw new Error("Cliente no encontrado");

  const number = await nextSolicitudNumber();
  const diasSinOC = Math.max(0, daysBetween(data.fechaTrabajo, new Date()));

  return prisma.solicitudOrdenCompra.create({
    data: {
      number,
      workOrderId: data.workOrderId,
      clientId: data.clientId,
      fechaTrabajo: data.fechaTrabajo,
      fechaEntrega: data.fechaEntrega,
      diasSinOC,
      solicitud1: data.solicitud1 ?? null,
      solicitud2: data.solicitud2 ?? null,
      solicitud3: data.solicitud3 ?? null,
      notasInternas: data.notasInternas ?? null,
      status: "SOLICITUD_GENERADA",
      createdById: userId,
    },
    include: INCLUDE_BASE,
  });
}

export async function updateSolicitud(
  id: string,
  data: Partial<SolicitudInput>,
  _userId: string
) {
  const existing = await prisma.solicitudOrdenCompra.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw new Error("Solicitud no encontrada");
  if (
    existing.status !== "SOLICITUD_GENERADA" &&
    existing.status !== "EN_REVISION"
  ) {
    throw new Error("La solicitud no es editable en su estado actual");
  }

  const updateData: any = {};
  if (data.workOrderId !== undefined) updateData.workOrderId = data.workOrderId;
  if (data.clientId !== undefined) updateData.clientId = data.clientId;
  if (data.fechaTrabajo !== undefined) {
    updateData.fechaTrabajo = data.fechaTrabajo;
    updateData.diasSinOC = Math.max(0, daysBetween(data.fechaTrabajo, new Date()));
  }
  if (data.fechaEntrega !== undefined) updateData.fechaEntrega = data.fechaEntrega;
  if (data.solicitud1 !== undefined) updateData.solicitud1 = data.solicitud1;
  if (data.solicitud2 !== undefined) updateData.solicitud2 = data.solicitud2;
  if (data.solicitud3 !== undefined) updateData.solicitud3 = data.solicitud3;
  if (data.notasInternas !== undefined) updateData.notasInternas = data.notasInternas;

  return prisma.solicitudOrdenCompra.update({
    where: { id },
    data: updateData,
    include: INCLUDE_BASE,
  });
}

export async function updateSolicitudReview(
  id: string,
  data: SolicitudReviewInput,
  _userId: string
) {
  const existing = await prisma.solicitudOrdenCompra.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw new Error("Solicitud no encontrada");
  if (existing.status !== "EN_REVISION") {
    throw new Error("La solicitud no está en revisión");
  }

  // Verify supplier exists
  const supplier = await prisma.supplier.findFirst({
    where: { id: data.supplierId, deletedAt: null },
  });
  if (!supplier) throw new Error("Proveedor no encontrado");

  // Compute subtotal and total
  const subtotal = data.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const discount = data.discount ?? 0;
  const discountType = data.discountType ?? "NONE";
  let discountAmount = 0;
  if (discountType === "AMOUNT") discountAmount = discount;
  else if (discountType === "PERCENT") discountAmount = subtotal * (discount / 100);
  const taxable = Math.max(0, subtotal - discountAmount);
  const tax = taxable * TAX_RATE;
  const total = taxable + tax;

  return prisma.$transaction(async (tx) => {
    // Soft-delete previous items
    await tx.solicitudItem.updateMany({
      where: { solicitudId: id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    // Create new items
    await tx.solicitudItem.createMany({
      data: data.items.map((item) => ({
        solicitudId: id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
      })),
    });
    // Update solicitud
    return tx.solicitudOrdenCompra.update({
      where: { id },
      data: {
        supplierId: data.supplierId,
        subtotal,
        tax,
        total,
        discount,
        discountType,
      },
      include: INCLUDE_FULL,
    });
  });
}

export async function transitionSolicitud(
  id: string,
  action: "submit" | "approve" | "reject" | "cancel",
  userId: string,
  isAdmin: boolean,
  reason?: string
) {
  const existing = await prisma.solicitudOrdenCompra.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw new Error("Solicitud no encontrada");

  const isCreator = existing.createdById === userId;
  const today = new Date();

  if (action === "submit") {
    if (existing.status !== "SOLICITUD_GENERADA")
      throw new Error(`Transición no permitida: ${existing.status} → submit`);
    if (!isCreator && !isAdmin)
      throw new Error("No tienes permiso para hacer submit de esta solicitud");
    return prisma.solicitudOrdenCompra.update({
      where: { id },
      data: { status: "EN_REVISION" },
      include: INCLUDE_BASE,
    });
  }

  if (action === "approve") {
    if (!isAdmin) throw new Error("Solo administradores pueden aprobar");
    if (existing.status !== "EN_REVISION")
      throw new Error(`Transición no permitida: ${existing.status} → approve`);
    if (!existing.supplierId)
      throw new Error(
        "Falta seleccionar proveedor y al menos 1 item antes de aprobar"
      );
    const itemCount = await prisma.solicitudItem.count({
      where: { solicitudId: id, deletedAt: null },
    });
    if (itemCount === 0)
      throw new Error(
        "Falta seleccionar proveedor y al menos 1 item antes de aprobar"
      );

    return prisma.$transaction(async (tx) => {
      const purchaseNumber = await nextPurchaseNumber();
      const items = await tx.solicitudItem.findMany({
        where: { solicitudId: id, deletedAt: null },
        orderBy: { createdAt: "asc" },
      });
      const purchase = await tx.purchase.create({
        data: {
          number: purchaseNumber,
          supplierId: existing.supplierId!,
          status: "SENT",
          subtotal: existing.subtotal ?? 0,
          tax: existing.tax ?? 0,
          total: existing.total ?? 0,
          discount: existing.discount ?? 0,
          discountType: existing.discountType ?? "NONE",
          createdById: userId,
          items: {
            create: items.map((it) => ({
              description: it.description,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              total: it.total,
            })),
          },
        },
      });
      return tx.solicitudOrdenCompra.update({
        where: { id },
        data: {
          status: "ORDEN_EMITIDA",
          purchaseId: purchase.id,
        },
        include: { ...INCLUDE_BASE, purchase: { select: { id: true, number: true } } },
      });
    });
  }

  if (action === "reject") {
    if (!isAdmin) throw new Error("Solo administradores pueden rechazar");
    if (existing.status !== "EN_REVISION")
      throw new Error(`Transición no permitida: ${existing.status} → reject`);
    if (!reason || reason.trim().length === 0)
      throw new Error("Motivo de rechazo requerido");
    return prisma.solicitudOrdenCompra.update({
      where: { id },
      data: {
        status: "RECHAZADA",
        rejectionReason: reason,
        rejectedById: userId,
        rejectedAt: today,
      },
      include: INCLUDE_BASE,
    });
  }

  if (action === "cancel") {
    if (!isCreator && !isAdmin)
      throw new Error("No tienes permiso para cancelar esta solicitud");
    if (existing.status !== "SOLICITUD_GENERADA" && existing.status !== "EN_REVISION")
      throw new Error(`Transición no permitida: ${existing.status} → cancel`);
    return prisma.solicitudOrdenCompra.update({
      where: { id },
      data: { status: "CANCELADA" },
      include: INCLUDE_BASE,
    });
  }

  throw new Error("Acción no reconocida");
}

export async function deleteSolicitud(id: string, userId: string) {
  const existing = await prisma.solicitudOrdenCompra.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw new Error("Solicitud no encontrada");
  if (existing.status === "ORDEN_EMITIDA")
    throw new Error("No se puede eliminar una solicitud ya emitida");
  if (existing.createdById !== userId)
    throw new Error("No tienes permiso para eliminar esta solicitud");
  return prisma.solicitudOrdenCompra.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
cd /Users/francisco/Desktop/metalu && npx tsc --noEmit 2>&1 | grep -E "solicitud" | head -20
```

Expected: no errors specific to `solicitudService.ts`. If there are Prisma type errors (e.g. `Property 'solicitudOrdenCompra' does not exist`), the dev server needs to be restarted to pick up the new Prisma client. Tell the user to restart.

- [ ] **Step 3: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add src/modules/solicitudes/services/solicitudService.ts
git -C /Users/francisco/Desktop/metalu commit -m "feat(purchases): add Solicitud service with state machine and side effects

6 functions: getSolicitudes, getSolicitudById, createSolicitud,
updateSolicitud (paso 1), updateSolicitudReview (paso 2 admin),
transitionSolicitud (submit/approve/reject/cancel with side effects
on approve: creates Purchase + PurchaseItems in a Prisma transaction),
deleteSolicitud. RUT-style number generation (SOL-YYYY-NNN and
OC-YYYY-NNN), 19% tax calc, days-since-OC auto-calc."
```

---

## Task 5: Create API Route GET/POST `/api/solicitudes`

**Files:**
- Create: `src/app/api/solicitudes/route.ts`

- [ ] **Step 1: Create the route file**

Write to `src/app/api/solicitudes/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  getSolicitudes,
  createSolicitud,
} from "@/modules/solicitudes/services/solicitudService";
import { SolicitudSchema } from "@/modules/solicitudes/validations/solicitudSchemas";
import { SolicitudStatus } from "@/modules/solicitudes/types/solicitud";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as SolicitudStatus | null;
  const workOrderId = searchParams.get("workOrderId");

  try {
    const data = await getSolicitudes({
      ...(status ? { status } : {}),
      ...(workOrderId ? { workOrderId } : {}),
    });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = SolicitudSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  try {
    const created = await createSolicitud(parsed.data, session.user.id);
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    const msg = err.message ?? "Error al crear la solicitud";
    if (msg.includes("no encontrado")) {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
```

- [ ] **Step 2: Verify the route handler compiles**

Run:
```bash
cd /Users/francisco/Desktop/metalu && npx tsc --noEmit 2>&1 | grep -E "solicitudes/route" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add src/app/api/solicitudes/route.ts
git -C /Users/francisco/Desktop/metalu commit -m "feat(purchases): add GET/POST /api/solicitudes route"
```

---

## Task 6: Create API Route GET/PATCH/DELETE `/api/solicitudes/[id]`

**Files:**
- Create: `src/app/api/solicitudes/[id]/route.ts`

- [ ] **Step 1: Create the route file**

Write to `src/app/api/solicitudes/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  getSolicitudById,
  updateSolicitud,
  updateSolicitudReview,
  deleteSolicitud,
} from "@/modules/solicitudes/services/solicitudService";
import {
  SolicitudSchema,
  SolicitudReviewSchema,
} from "@/modules/solicitudes/validations/solicitudSchemas";
import { isAdmin } from "@/lib/auth/permissions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const data = await getSolicitudById(id);
    if (!data)
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;
  const admin = await isAdmin(userId);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  // Determine which schema to use based on which fields are present
  const isReview = "supplierId" in body || "items" in body;
  if (isReview) {
    if (!admin) {
      return NextResponse.json(
        { error: "Solo administradores pueden editar la revisión" },
        { status: 403 }
      );
    }
    const parsed = SolicitudReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join("; ") },
        { status: 400 }
      );
    }
    try {
      const updated = await updateSolicitudReview(id, parsed.data, userId);
      return NextResponse.json(updated);
    } catch (err: any) {
      const msg = err.message ?? "Error al actualizar";
      const status = msg.includes("no encontrado")
        ? 404
        : msg.includes("No tienes permiso")
        ? 403
        : 400;
      return NextResponse.json({ error: msg }, { status });
    }
  } else {
    const parsed = SolicitudSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join("; ") },
        { status: 400 }
      );
    }
    try {
      const updated = await updateSolicitud(id, parsed.data, userId);
      return NextResponse.json(updated);
    } catch (err: any) {
      const msg = err.message ?? "Error al actualizar";
      const status = msg.includes("no encontrada")
        ? 404
        : msg.includes("No tienes permiso")
        ? 403
        : 400;
      return NextResponse.json({ error: msg }, { status });
    }
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    await deleteSolicitud(id, session.user.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const msg = err.message ?? "Error al eliminar";
    if (msg.includes("no encontrada"))
      return NextResponse.json({ error: msg }, { status: 404 });
    if (msg.includes("No se puede eliminar"))
      return NextResponse.json({ error: msg }, { status: 409 });
    if (msg.includes("No tienes permiso"))
      return NextResponse.json({ error: msg }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify the auth helpers exist**

Run:
```bash
ls /Users/francisco/Desktop/metalu/src/lib/auth/
```

Expected: files including `auth.ts` and `permissions.ts`. If `isAdmin` does not exist in `permissions.ts`, the next step will fail — open `src/lib/auth/permissions.ts` and check the exported helpers. If it doesn't exist, add a helper:

```ts
// src/lib/auth/permissions.ts
export async function isAdmin(userId: string): Promise<boolean> {
  const { prisma } = await import("@/lib/prisma/prisma");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });
  if (!user) return false;
  return user.roles.some((ur) => ur.role.name === "admin");
}
```

Adjust the import paths to match the project conventions if different.

- [ ] **Step 3: Typecheck**

Run:
```bash
cd /Users/francisco/Desktop/metalu && npx tsc --noEmit 2>&1 | grep -E "solicitudes/\[id\]/route" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add src/app/api/solicitudes/[id]/route.ts
git -C /Users/francisco/Desktop/metalu commit -m "feat(purchases): add GET/PATCH/DELETE /api/solicitudes/[id] route"
```

---

## Task 7: Create API Route POST `/api/solicitudes/[id]/transitions`

**Files:**
- Create: `src/app/api/solicitudes/[id]/transitions/route.ts`

- [ ] **Step 1: Create the transitions route file**

Write to `src/app/api/solicitudes/[id]/transitions/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { transitionSolicitud } from "@/modules/solicitudes/services/solicitudService";
import { SolicitudTransitionSchema } from "@/modules/solicitudes/validations/solicitudSchemas";
import { isAdmin } from "@/lib/auth/permissions";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;
  const admin = await isAdmin(userId);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = SolicitudTransitionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  try {
    const updated = await transitionSolicitud(
      id,
      parsed.data.action,
      userId,
      admin,
      parsed.data.reason
    );
    return NextResponse.json(updated);
  } catch (err: any) {
    const msg = err.message ?? "Error en la transición";
    let status = 500;
    if (msg.includes("no encontrada") || msg.includes("No encontrado"))
      status = 404;
    else if (
      msg.includes("Solo administradores") ||
      msg.includes("No tienes permiso")
    )
      status = 403;
    else if (msg.includes("Transición no permitida")) status = 400;
    else if (msg.includes("Falta seleccionar")) status = 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
cd /Users/francisco/Desktop/metalu && npx tsc --noEmit 2>&1 | grep -E "solicitudes/\[id\]/transitions/route" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add src/app/api/solicitudes/[id]/transitions/route.ts
git -C /Users/francisco/Desktop/metalu commit -m "feat(purchases): add POST /api/solicitudes/[id]/transitions route

State machine: submit (creator), approve (admin, creates Purchase),
reject (admin, requires reason), cancel (creator or admin). Each
action has a permission check and side effects handled in the service."
```

---

## Task 8: Create SolicitudForm Component (Paso 1 — the design mockup)

**Files:**
- Create: `src/modules/solicitudes/components/SolicitudForm.tsx`

- [ ] **Step 1: Read the existing EncargadoForm for pattern reference**

Open `src/modules/encargados/components/EncargadoForm.tsx` to match the style. The SolicitudForm uses the same `useState` + fetch pattern (not react-hook-form).

- [ ] **Step 2: Create the SolicitudForm component**

Write to `src/modules/solicitudes/components/SolicitudForm.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, Calendar, Save, Trash2, Eraser, LogOut, Search, UserSearch } from "lucide-react";
import Link from "next/link";

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function daysBetween(from: string, to: string): number {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

type ClientOpt = { id: string; name: string; code: string; rut: string | null };
type WorkOrderOpt = { id: string; number: string; title: string; clientId: string };

export function SolicitudForm({ initialWorkOrderId }: { initialWorkOrderId?: string }) {
  const router = useRouter();
  const [trabajoNumero, setTrabajoNumero] = useState("");
  const [workOrderId, setWorkOrderId] = useState(initialWorkOrderId ?? "");
  const [rut, setRut] = useState("");
  const [clientId, setClientId] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [fechaTrabajo, setFechaTrabajo] = useState(todayISO());
  const [fechaEntrega, setFechaEntrega] = useState(todayISO());
  const [diasSinOC, setDiasSinOC] = useState(0);
  const [solicitud1, setSolicitud1] = useState("");
  const [solicitud2, setSolicitud2] = useState("");
  const [solicitud3, setSolicitud3] = useState("");
  const [notasInternas, setNotasInternas] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderOpt[]>([]);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [workOrderSearchOpen, setWorkOrderSearchOpen] = useState(false);

  // Auto-calculate diasSinOC when fechaTrabajo changes
  useEffect(() => {
    setDiasSinOC(daysBetween(fechaTrabajo, todayISO()));
  }, [fechaTrabajo]);

  // Load clients and work orders for the pickers
  useEffect(() => {
    fetch("/api/clients?activeOnly=true")
      .then((r) => r.json())
      .then((d) => setClients(Array.isArray(d) ? d : []))
      .catch(() => {});
    fetch("/api/work-orders")
      .then((r) => r.json())
      .then((d) => setWorkOrders(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  function handleLimpia() {
    setTrabajoNumero("");
    setWorkOrderId(initialWorkOrderId ?? "");
    setRut("");
    setClientId("");
    setClienteNombre("");
    setFechaTrabajo(todayISO());
    setFechaEntrega(todayISO());
    setDiasSinOC(0);
    setSolicitud1("");
    setSolicitud2("");
    setSolicitud3("");
    setNotasInternas("");
    setError(null);
  }

  function handleBorrar() {
    if (!confirm("¿Borrar todos los datos del formulario?")) return;
    handleLimpia();
  }

  async function handleGrabar() {
    setError(null);
    if (!workOrderId) {
      setError("Selecciona un trabajo");
      return;
    }
    if (!clientId) {
      setError("Selecciona un cliente");
      return;
    }
    if (!fechaTrabajo || !fechaEntrega) {
      setError("Las fechas de trabajo y entrega son requeridas");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workOrderId,
          clientId,
          fechaTrabajo,
          fechaEntrega,
          diasSinOC,
          solicitud1: solicitud1 || null,
          solicitud2: solicitud2 || null,
          solicitud3: solicitud3 || null,
          notasInternas: notasInternas || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al crear la solicitud");
        return;
      }
      const created = await res.json();
      router.push(`/purchases/solicitudes/${created.id}`);
    } catch (e: any) {
      setError(e.message ?? "Error de red");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredClients = clients.filter(
    (c) =>
      !rut ||
      c.rut?.toLowerCase().includes(rut.toLowerCase()) ||
      c.name.toLowerCase().includes(rut.toLowerCase()) ||
      c.code.toLowerCase().includes(rut.toLowerCase())
  );

  const filteredWOs = workOrders.filter((w) =>
    !trabajoNumero ||
    w.number.toLowerCase().includes(trabajoNumero.toLowerCase()) ||
    w.title.toLowerCase().includes(trabajoNumero.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Solicitud de Orden de Compra</h1>
          <p className="text-sm text-muted-foreground">
            Complete details to initiate a purchase order request.
          </p>
        </div>
        <Badge className="bg-[#14679C] text-white px-3 py-1 text-xs">
          STATUS: DRAFT
        </Badge>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Detalles del Trabajo */}
          <Card className="p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
              <Info className="h-5 w-5 text-[#14679C]" />
              Detalles del Trabajo
            </h2>
            <hr className="mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold tracking-wide">TRABAJO N°</Label>
                <div className="flex gap-2">
                  <Input
                    value={trabajoNumero}
                    onChange={(e) => setTrabajoNumero(e.target.value)}
                    placeholder="34250"
                    className="bg-yellow-50 font-mono"
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="bg-[#14679C] hover:bg-[#14679C]/90 shrink-0"
                    onClick={() => setWorkOrderSearchOpen((v) => !v)}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                {workOrderSearchOpen && (
                  <div className="border rounded-md p-2 max-h-48 overflow-y-auto bg-background">
                    {filteredWOs.length === 0 && (
                      <div className="text-sm text-muted-foreground p-2">Sin resultados</div>
                    )}
                    {filteredWOs.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          setWorkOrderId(w.id);
                          setTrabajoNumero(w.number);
                          // Pre-fill client if WO has one
                          const woClient = clients.find((c) => c.id === w.clientId);
                          if (woClient) {
                            setClientId(woClient.id);
                            setClienteNombre(woClient.name);
                            setRut(woClient.rut ?? "");
                          }
                          setWorkOrderSearchOpen(false);
                        }}
                        className="w-full text-left text-sm p-2 hover:bg-muted rounded"
                      >
                        <div className="font-mono font-semibold">{w.number}</div>
                        <div className="text-xs text-muted-foreground">{w.title}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold tracking-wide">RUT CLIENTE</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={rut}
                      onChange={(e) => {
                        setRut(e.target.value);
                        setClientSearchOpen(true);
                      }}
                      onFocus={() => setClientSearchOpen(true)}
                      placeholder="e.g., 76.543.210-K"
                      className="pl-9"
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => setClientSearchOpen((v) => !v)}
                  >
                    <UserSearch className="h-4 w-4" />
                  </Button>
                </div>
                {clientSearchOpen && (
                  <div className="border rounded-md p-2 max-h-48 overflow-y-auto bg-background">
                    {filteredClients.length === 0 && (
                      <div className="text-sm text-muted-foreground p-2">Sin resultados</div>
                    )}
                    {filteredClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setClientId(c.id);
                          setClienteNombre(c.name);
                          setRut(c.rut ?? "");
                          setClientSearchOpen(false);
                        }}
                        className="w-full text-left text-sm p-2 hover:bg-muted rounded"
                      >
                        <div className="font-semibold">{c.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {c.rut ?? "—"} · {c.code}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Label className="text-xs font-semibold tracking-wide">NOMBRE DEL CLIENTE</Label>
              <Input
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                placeholder="Nombre completo o razón social"
                readOnly={!!clientId}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold tracking-wide">FECHA TRABAJO</Label>
                <Input
                  type="date"
                  value={fechaTrabajo}
                  onChange={(e) => setFechaTrabajo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold tracking-wide">FECHA ENTREGA TRABAJO</Label>
                <Input
                  type="date"
                  value={fechaEntrega}
                  onChange={(e) => setFechaEntrega(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 mt-4 max-w-[200px]">
              <Label className="text-xs font-semibold tracking-wide">DÍAS SIN ORDEN DE COMPRA</Label>
              <Input type="number" value={diasSinOC} onChange={(e) => setDiasSinOC(Number(e.target.value))} />
            </div>
          </Card>

          {/* Fechas de Solicitud */}
          <Card className="p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
              <Calendar className="h-5 w-5 text-[#14679C]" />
              Fechas de Solicitud
            </h2>
            <hr className="mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold tracking-wide">SOLICITUD 1</Label>
                <Input type="date" value={solicitud1} onChange={(e) => setSolicitud1(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold tracking-wide">SOLICITUD 2</Label>
                <Input type="date" value={solicitud2} onChange={(e) => setSolicitud2(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold tracking-wide">SOLICITUD 3</Label>
                <Input type="date" value={solicitud3} onChange={(e) => setSolicitud3(e.target.value)} />
              </div>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-1 space-y-4">
          {/* Purchase Workflow */}
          <Card className="p-6">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground mb-4">
              PURCHASE WORKFLOW
            </h3>
            <ol className="space-y-3">
              <li className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-8 w-8 rounded-full bg-[#14679C] text-white flex items-center justify-center font-semibold text-sm">
                    1
                  </div>
                  <div className="w-px flex-1 bg-border mt-1" />
                </div>
                <div className="pt-1">
                  <div className="font-semibold text-sm text-[#14679C]">Solicitud Generada</div>
                  <div className="text-xs text-muted-foreground">Current Step</div>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-semibold text-sm">
                    2
                  </div>
                  <div className="w-px flex-1 bg-border mt-1" />
                </div>
                <div className="pt-1">
                  <div className="font-semibold text-sm text-muted-foreground">Revisión de Gerencia</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-semibold text-sm">
                    3
                  </div>
                </div>
                <div className="pt-1">
                  <div className="font-semibold text-sm text-muted-foreground">Orden Emitida</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
              </li>
            </ol>
          </Card>

          {/* Notas Internas */}
          <Card className="p-6">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground mb-4">
              NOTAS INTERNAS
            </h3>
            <Textarea
              value={notasInternas}
              onChange={(e) => setNotasInternas(e.target.value)}
              placeholder="Add relevant information about this request..."
              rows={6}
            />
          </Card>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={handleLimpia} disabled={submitting}>
          <Eraser className="h-4 w-4 mr-2" />
          LIMPIA
        </Button>
        <Button type="button" variant="outline" className="text-destructive border-destructive" onClick={handleBorrar} disabled={submitting}>
          <Trash2 className="h-4 w-4 mr-2" />
          BORRAR
        </Button>
        <Button type="button" onClick={handleGrabar} disabled={submitting} className="bg-[#14679C] hover:bg-[#14679C]/90">
          <Save className="h-4 w-4 mr-2" />
          {submitting ? "Guardando..." : "GRABAR"}
        </Button>
        <Link href="/purchases">
          <Button type="button" variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            SALIR
          </Button>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify the lucide-react icons are available**

Run:
```bash
rg "from \"lucide-react\"" /Users/francisco/Desktop/metalu/src/modules/clients/components/ClientForm.tsx 2>/dev/null | head -3
```

Expected: a line confirming `lucide-react` is used in the project. The icons `Info, Calendar, Save, Trash2, Eraser, LogOut, Search, UserSearch` are all standard lucide-react exports.

- [ ] **Step 4: Typecheck**

Run:
```bash
cd /Users/francisco/Desktop/metalu && npx tsc --noEmit 2>&1 | grep -E "SolicitudForm" | head -20
```

Expected: no errors specific to `SolicitudForm.tsx`.

- [ ] **Step 5: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add src/modules/solicitudes/components/SolicitudForm.tsx
git -C /Users/francisco/Desktop/metalu commit -m "feat(purchases): add SolicitudForm (paso 1) component

The design-mockup form: Trabajo N, RUT Cliente with search pickers,
fecha trabajo, fecha entrega, dias sin OC (auto-calc), 3 solicitud
dates, notas internas, purchase workflow steps. Submit creates
SolicitudOrdenCompra via POST /api/solicitudes and navigates to the
detail view."
```

---

## Task 9: Create SolicitudItemsTable + SolicitudReviewForm (Paso 2 — admin)

**Files:**
- Create: `src/modules/solicitudes/components/SolicitudItemsTable.tsx`
- Create: `src/modules/solicitudes/components/SolicitudReviewForm.tsx`

- [ ] **Step 1: Create SolicitudItemsTable**

Write to `src/modules/solicitudes/components/SolicitudItemsTable.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

export type DraftItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export function SolicitudItemsTable({
  items,
  onChange,
  readOnly = false,
}: {
  items: DraftItem[];
  onChange: (next: DraftItem[]) => void;
  readOnly?: boolean;
}) {
  function update(index: number, patch: Partial<DraftItem>) {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }
  function add() {
    onChange([...items, { description: "", quantity: 1, unitPrice: 0 }]);
  }
  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-1">
        <div className="col-span-6">Descripción</div>
        <div className="col-span-2 text-right">Cantidad</div>
        <div className="col-span-2 text-right">Precio Unit.</div>
        <div className="col-span-1 text-right">Total</div>
        <div className="col-span-1" />
      </div>
      {items.map((it, i) => {
        const total = it.quantity * it.unitPrice;
        return (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <Input
              className="col-span-6"
              value={it.description}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder="Descripción del item"
              readOnly={readOnly}
            />
            <Input
              className="col-span-2 text-right"
              type="number"
              step="0.01"
              min="0"
              value={it.quantity}
              onChange={(e) => update(i, { quantity: Number(e.target.value) })}
              readOnly={readOnly}
            />
            <Input
              className="col-span-2 text-right"
              type="number"
              step="0.01"
              min="0"
              value={it.unitPrice}
              onChange={(e) => update(i, { unitPrice: Number(e.target.value) })}
              readOnly={readOnly}
            />
            <div className="col-span-1 text-right text-sm font-mono">
              {total.toLocaleString("es-CL", { style: "currency", currency: "CLP" })}
            </div>
            <div className="col-span-1 text-right">
              {!readOnly && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => remove(i)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
      {!readOnly && (
        <Button type="button" variant="outline" size="sm" onClick={add} className="mt-2">
          <Plus className="h-4 w-4 mr-1" />
          Agregar item
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create SolicitudReviewForm**

Write to `src/modules/solicitudes/components/SolicitudReviewForm.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import { SolicitudItemsTable, DraftItem } from "./SolicitudItemsTable";

type SupplierOpt = { id: string; name: string };
type ExistingItem = { id?: string; description: string; quantity: number; unitPrice: number };

const TAX_RATE = 0.19;

export function SolicitudReviewForm({
  solicitudId,
  initialSupplierId,
  initialItems,
  initialDiscount,
  initialDiscountType,
}: {
  solicitudId: string;
  initialSupplierId: string | null;
  initialItems: ExistingItem[];
  initialDiscount: number | null;
  initialDiscountType: "NONE" | "AMOUNT" | "PERCENT" | null;
}) {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<SupplierOpt[]>([]);
  const [supplierId, setSupplierId] = useState(initialSupplierId ?? "");
  const [items, setItems] = useState<DraftItem[]>(
    initialItems.length > 0
      ? initialItems.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        }))
      : [{ description: "", quantity: 1, unitPrice: 0 }]
  );
  const [discount, setDiscount] = useState<number>(initialDiscount ?? 0);
  const [discountType, setDiscountType] = useState<"NONE" | "AMOUNT" | "PERCENT">(
    initialDiscountType ?? "NONE"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/suppliers?activeOnly=true")
      .then((r) => r.json())
      .then((d) => setSuppliers(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  let discountAmount = 0;
  if (discountType === "AMOUNT") discountAmount = discount;
  else if (discountType === "PERCENT") discountAmount = subtotal * (discount / 100);
  const taxable = Math.max(0, subtotal - discountAmount);
  const tax = taxable * TAX_RATE;
  const total = taxable + tax;

  async function handleSave() {
    setError(null);
    if (!supplierId) {
      setError("Selecciona un proveedor");
      return;
    }
    if (items.length === 0 || items.some((it) => !it.description)) {
      setError("Todos los items requieren descripción");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/solicitudes/${solicitudId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, items, discount, discountType }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al guardar la revisión");
        return;
      }
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? "Error de red");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-lg font-semibold">Revisión de Gerencia</h2>
      <hr />

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2 max-w-md">
        <Label className="text-xs font-semibold tracking-wide">PROVEEDOR</Label>
        <Select value={supplierId} onValueChange={setSupplierId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un proveedor" />
          </SelectTrigger>
          <SelectContent>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold tracking-wide">ITEMS</Label>
        <SolicitudItemsTable items={items} onChange={setItems} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold tracking-wide">DESCUENTO</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold tracking-wide">TIPO DESCUENTO</Label>
          <Select value={discountType} onValueChange={(v) => setDiscountType(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">Ninguno</SelectItem>
              <SelectItem value="AMOUNT">Monto</SelectItem>
              <SelectItem value="PERCENT">Porcentaje</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold tracking-wide">SUBTOTAL</Label>
          <div className="h-10 px-3 py-2 border rounded-md bg-muted text-sm font-mono">
            {subtotal.toLocaleString("es-CL", { style: "currency", currency: "CLP" })}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold tracking-wide">TOTAL</Label>
          <div className="h-10 px-3 py-2 border rounded-md bg-muted text-sm font-mono font-semibold">
            {total.toLocaleString("es-CL", { style: "currency", currency: "CLP" })}
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        IVA (19%): {tax.toLocaleString("es-CL", { style: "currency", currency: "CLP" })}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={submitting}>
          <Save className="h-4 w-4 mr-2" />
          {submitting ? "Guardando..." : "Guardar revisión"}
        </Button>
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Typecheck**

Run:
```bash
cd /Users/francisco/Desktop/metalu && npx tsc --noEmit 2>&1 | grep -E "Solicitud(Items|Review)" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add src/modules/solicitudes/components/SolicitudItemsTable.tsx src/modules/solicitudes/components/SolicitudReviewForm.tsx
git -C /Users/francisco/Desktop/metalu commit -m "feat(purchases): add SolicitudReviewForm and SolicitudItemsTable (paso 2)

Admin-only review form: supplier selector, editable items table with
auto-totals (subtotal, 19% IVA, discount AMOUNT/PERCENT, total).
PATCHes /api/solicitudes/:id with the review data; service handles
soft-delete-and-recreate of items + totals recalc."
```

---

## Task 10: Create SolicitudesTable Component

**Files:**
- Create: `src/modules/solicitudes/components/SolicitudesTable.tsx`

- [ ] **Step 1: Create the table component**

Write to `src/modules/solicitudes/components/SolicitudesTable.tsx`:

```tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/tables/DataTable";
import { Eye } from "lucide-react";
import type { SolicitudOrdenCompraListItem } from "../types/solicitud";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SOLICITUD_GENERADA: "secondary",
  EN_REVISION: "default",
  ORDEN_EMITIDA: "default",
  RECHAZADA: "destructive",
  CANCELADA: "outline",
};

const STATUS_LABEL: Record<string, string> = {
  SOLICITUD_GENERADA: "Solicitud Generada",
  EN_REVISION: "En Revisión",
  ORDEN_EMITIDA: "Orden Emitida",
  RECHAZADA: "Rechazada",
  CANCELADA: "Cancelada",
};

export const columns: ColumnDef<SolicitudOrdenCompraListItem>[] = [
  {
    accessorKey: "number",
    header: "Número",
    cell: ({ row }) => (
      <span className="font-mono font-semibold">{row.original.number}</span>
    ),
  },
  {
    id: "workOrder",
    header: "Trabajo",
    cell: ({ row }) => row.original.workOrder?.number ?? "—",
  },
  {
    id: "client",
    header: "Cliente",
    cell: ({ row }) => row.original.client?.name ?? "—",
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => (
      <Badge variant={STATUS_VARIANT[row.original.status] ?? "secondary"}>
        {STATUS_LABEL[row.original.status] ?? row.original.status}
      </Badge>
    ),
  },
  {
    id: "supplier",
    header: "Proveedor",
    cell: ({ row }) => row.original.supplier?.name ?? <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: "fechaTrabajo",
    header: "Fecha Trabajo",
    cell: ({ row }) => new Date(row.original.fechaTrabajo).toLocaleDateString("es-CL"),
  },
  {
    accessorKey: "diasSinOC",
    header: "Días s/OC",
    cell: ({ row }) => row.original.diasSinOC,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Link href={`/purchases/solicitudes/${row.original.id}`}>
        <Button size="sm" variant="ghost">
          <Eye className="h-4 w-4" />
        </Button>
      </Link>
    ),
  },
];

export function SolicitudesTable({ data }: { data: SolicitudOrdenCompraListItem[] }) {
  return <DataTable columns={columns} data={data} />;
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
cd /Users/francisco/Desktop/metalu && npx tsc --noEmit 2>&1 | grep -E "SolicitudesTable" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add src/modules/solicitudes/components/SolicitudesTable.tsx
git -C /Users/francisco/Desktop/metalu commit -m "feat(purchases): add SolicitudesTable for the Solicitudes tab"
```

---

## Task 11: Create TransitionDialogs Component

**Files:**
- Create: `src/modules/solicitudes/components/TransitionDialogs.tsx`

- [ ] **Step 1: Create the dialogs file**

Write to `src/modules/solicitudes/components/TransitionDialogs.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type BaseProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason?: string) => Promise<void>;
};

export function RejectDialog({ open, onOpenChange, onConfirm }: BaseProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await onConfirm(reason);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rechazar solicitud</DialogTitle>
          <DialogDescription>
            Indica el motivo del rechazo. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-xs font-semibold tracking-wide">MOTIVO</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explica por qué se rechaza esta solicitud..."
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={submitting || !reason.trim()}>
            {submitting ? "Rechazando..." : "Rechazar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CancelDialog({ open, onOpenChange, onConfirm }: BaseProps) {
  const [submitting, setSubmitting] = useState(false);
  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar solicitud</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que querés cancelar esta solicitud? Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            No, volver
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Cancelando..." : "Sí, cancelar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ApproveProps = BaseProps & {
  summary: { supplierName: string; total: number; itemCount: number };
};

export function ApproveDialog({ open, onOpenChange, onConfirm, summary }: ApproveProps) {
  const [submitting, setSubmitting] = useState(false);
  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aprobar y emitir orden de compra</DialogTitle>
          <DialogDescription>
            Se creará una nueva Purchase Order en estado SENT con los siguientes datos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Proveedor:</span>
            <span className="font-semibold">{summary.supplierName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Items:</span>
            <span className="font-semibold">{summary.itemCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-semibold">
              {summary.total.toLocaleString("es-CL", { style: "currency", currency: "CLP" })}
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={submitting} className="bg-green-600 hover:bg-green-700">
            {submitting ? "Aprobando..." : "Aprobar y Emitir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
cd /Users/francisco/Desktop/metalu && npx tsc --noEmit 2>&1 | grep -E "TransitionDialogs" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add src/modules/solicitudes/components/TransitionDialogs.tsx
git -C /Users/francisco/Desktop/metalu commit -m "feat(purchases): add TransitionDialogs (reject, cancel, approve)"
```

---

## Task 12: Create SolicitudDetailView Component (Full Detail Page)

**Files:**
- Create: `src/modules/solicitudes/components/SolicitudDetailView.tsx`

- [ ] **Step 1: Create the detail view component**

Write to `src/modules/solicitudes/components/SolicitudDetailView.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, X, CheckCircle2 } from "lucide-react";
import { SolicitudReviewForm } from "./SolicitudReviewForm";
import { RejectDialog, CancelDialog, ApproveDialog } from "./TransitionDialogs";
import type { SolicitudOrdenCompra } from "../types/solicitud";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SOLICITUD_GENERADA: "secondary",
  EN_REVISION: "default",
  ORDEN_EMITIDA: "default",
  RECHAZADA: "destructive",
  CANCELADA: "outline",
};

const STATUS_LABEL: Record<string, string> = {
  SOLICITUD_GENERADA: "SOLICITUD GENERADA",
  EN_REVISION: "EN REVISIÓN",
  ORDEN_EMITIDA: "ORDEN EMITIDA",
  RECHAZADA: "RECHAZADA",
  CANCELADA: "CANCELADA",
};

type CurrentUser = { id: string; role: "admin" | "trabajador" };

export function SolicitudDetailView({
  solicitud,
  currentUser,
}: {
  solicitud: SolicitudOrdenCompra;
  currentUser: CurrentUser;
}) {
  const router = useRouter();
  const isAdmin = currentUser.role === "admin";
  const isCreator = solicitud.createdById === currentUser.id;
  const isEditablePaso1 =
    solicitud.status === "SOLICITUD_GENERADA" && (isCreator || isAdmin);
  const isReviewable = solicitud.status === "EN_REVISION" && isAdmin;
  const isTerminal = ["ORDEN_EMITIDA", "RECHAZADA", "CANCELADA"].includes(solicitud.status);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function doTransition(action: "submit" | "approve" | "reject" | "cancel", body: any = {}) {
    setActionError(null);
    setActionInProgress(true);
    try {
      const res = await fetch(`/api/solicitudes/${solicitud.id}/transitions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error ?? "Error en la transición");
        return;
      }
      router.refresh();
    } catch (e: any) {
      setActionError(e.message ?? "Error de red");
    } finally {
      setActionInProgress(false);
    }
  }

  function fmtDate(d: Date | string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es-CL");
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/purchases">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-mono">{solicitud.number}</h1>
            <p className="text-sm text-muted-foreground">
              {solicitud.workOrder?.number} · {solicitud.client?.name}
            </p>
          </div>
        </div>
        <Badge variant={STATUS_VARIANT[solicitud.status]} className="px-3 py-1 text-xs">
          STATUS: {STATUS_LABEL[solicitud.status]}
        </Badge>
      </div>

      {actionError && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {/* Read-only paso 1 data */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Detalles del Trabajo</h2>
        <hr className="mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Trabajo N°</div>
            <div className="font-mono">{solicitud.workOrder?.number}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">RUT Cliente</div>
            <div className="font-mono">{solicitud.client?.code}</div>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground">Cliente</div>
            <div>{solicitud.client?.name}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Fecha Trabajo</div>
            <div>{fmtDate(solicitud.fechaTrabajo)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Fecha Entrega</div>
            <div>{fmtDate(solicitud.fechaEntrega)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Días sin OC</div>
            <div>{solicitud.diasSinOC}</div>
          </div>
        </div>
        <hr className="my-4" />
        <h3 className="text-sm font-semibold mb-2">Fechas de Solicitud</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Solicitud 1</div>
            <div>{fmtDate(solicitud.solicitud1)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Solicitud 2</div>
            <div>{fmtDate(solicitud.solicitud2)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Solicitud 3</div>
            <div>{fmtDate(solicitud.solicitud3)}</div>
          </div>
        </div>
        {solicitud.notasInternas && (
          <>
            <hr className="my-4" />
            <div className="text-xs text-muted-foreground">Notas Internas</div>
            <div className="text-sm whitespace-pre-wrap mt-1">{solicitud.notasInternas}</div>
          </>
        )}
      </Card>

      {/* Paso 2 review form (admin only, EN_REVISION) */}
      {isReviewable && (
        <SolicitudReviewForm
          solicitudId={solicitud.id}
          initialSupplierId={solicitud.supplierId}
          initialItems={solicitud.items}
          initialDiscount={solicitud.discount}
          initialDiscountType={solicitud.discountType}
        />
      )}

      {/* Emitted: show link to the created Purchase */}
      {solicitud.status === "ORDEN_EMITIDA" && solicitud.purchaseId && (
        <Card className="p-6 border-green-600">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div className="flex-1">
              <div className="font-semibold">PO Emitida</div>
              <div className="text-sm text-muted-foreground">
                La orden de compra fue creada y aparece en la pestaña "Emitidas" de /purchases.
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Rejected/Cancelled banner */}
      {solicitud.status === "RECHAZADA" && (
        <Card className="p-6 border-destructive">
          <div className="font-semibold text-destructive mb-2">Solicitud rechazada</div>
          {solicitud.rejectionReason && (
            <div className="text-sm">{solicitud.rejectionReason}</div>
          )}
        </Card>
      )}
      {solicitud.status === "CANCELADA" && (
        <Card className="p-6 border-muted">
          <div className="font-semibold text-muted-foreground">Solicitud cancelada</div>
        </Card>
      )}

      {/* Action bar */}
      {!isTerminal && (
        <div className="flex justify-end gap-2 pt-4 border-t">
          {solicitud.status === "SOLICITUD_GENERADA" && (isCreator || isAdmin) && (
            <Button onClick={() => doTransition("submit")} disabled={actionInProgress}>
              <Send className="h-4 w-4 mr-2" />
              Submit for review
            </Button>
          )}
          {isReviewable && (
            <>
              <Button
                variant="destructive"
                onClick={() => setRejectOpen(true)}
                disabled={actionInProgress}
              >
                <X className="h-4 w-4 mr-2" />
                Rechazar
              </Button>
              <Button
                onClick={() => setApproveOpen(true)}
                disabled={
                  actionInProgress ||
                  !solicitud.supplierId ||
                  solicitud.items.length === 0
                }
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Aprobar y Emitir
              </Button>
            </>
          )}
          {(isCreator || isAdmin) &&
            (solicitud.status === "SOLICITUD_GENERADA" || solicitud.status === "EN_REVISION") && (
              <Button variant="outline" onClick={() => setCancelOpen(true)} disabled={actionInProgress}>
                Cancelar solicitud
              </Button>
            )}
        </div>
      )}

      <RejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onConfirm={async (reason) => doTransition("reject", { reason })}
      />
      <CancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onConfirm={() => doTransition("cancel")}
      />
      <ApproveDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        onConfirm={() => doTransition("approve")}
        summary={{
          supplierName: solicitud.supplier?.name ?? "—",
          total: Number(solicitud.total ?? 0),
          itemCount: solicitud.items.length,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
cd /Users/francisco/Desktop/metalu && npx tsc --noEmit 2>&1 | grep -E "SolicitudDetailView" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add src/modules/solicitudes/components/SolicitudDetailView.tsx
git -C /Users/francisco/Desktop/metalu commit -m "feat(purchases): add SolicitudDetailView (full detail + transitions)

Header with status badge, read-only paso 1 data, paso 2 review form
(when admin and EN_REVISION), emitted/rejected/cancelled banners,
transition action bar (submit, reject, cancel, approve) with
appropriate permission gates and pre-conditions."
```

---

## Task 13: Modify `/purchases` Page to Add Tabs + "Nueva orden de compra" Button

**Files:**
- Modify: `src/app/(dashboard)/purchases/page.tsx`

- [ ] **Step 1: Read the current page**

```bash
bat /Users/francisco/Desktop/metalu/src/app/'(dashboard)'/purchases/page.tsx
```

- [ ] **Step 2: Replace the page contents**

Write to `src/app/(dashboard)/purchases/page.tsx`:

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getPurchases } from "@/modules/purchases/services/purchaseService";
import { getSolicitudes } from "@/modules/solicitudes/services/solicitudService";
import { PurchaseTable } from "@/modules/purchases/components/PurchaseTable";
import { SolicitudesTable } from "@/modules/solicitudes/components/SolicitudesTable";

export default async function PurchasesPage() {
  const [emitidas, solicitudes] = await Promise.all([
    getPurchases(),
    getSolicitudes(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Compras</h1>
          <p className="text-sm text-muted-foreground">Gestión de órdenes de compra</p>
        </div>
        <Link href="/purchases/solicitudes/new">
          <Button className="bg-[#14679C] hover:bg-[#14679C]/90">
            <Plus className="h-4 w-4 mr-2" />
            Nueva orden de compra
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="emitidas">
        <TabsList>
          <TabsTrigger value="emitidas">Emitidas</TabsTrigger>
          <TabsTrigger value="solicitudes">Solicitudes</TabsTrigger>
        </TabsList>
        <TabsContent value="emitidas" className="mt-4">
          <PurchaseTable data={emitidas as any} />
        </TabsContent>
        <TabsContent value="solicitudes" className="mt-4">
          <SolicitudesTable data={solicitudes as any} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 3: Verify shadcn Tabs is available**

Run:
```bash
ls /Users/francisco/Desktop/metalu/src/components/ui/tabs.tsx 2>&1
```

Expected: file exists. If not, install it via:
```bash
cd /Users/francisco/Desktop/metalu && npx shadcn@latest add tabs
```

- [ ] **Step 4: Typecheck**

Run:
```bash
cd /Users/francisco/Desktop/metalu && npx tsc --noEmit 2>&1 | grep -E "purchases/page" | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add "src/app/(dashboard)/purchases/page.tsx"
git -C /Users/francisco/Desktop/metalu commit -m "feat(purchases): add Tabs to /purchases page (Emitidas + Solicitudes)

Top-level page now has a 'Nueva orden de compra' button that navigates
to /purchases/solicitudes/new, and two tabs: Emitidas (existing
PurchaseTable) and Solicitudes (new SolicitudesTable). Both lists
loaded in parallel via Promise.all."
```

---

## Task 14: Create `/purchases/solicitudes/new` Page

**Files:**
- Create: `src/app/(dashboard)/purchases/solicitudes/new/page.tsx`

- [ ] **Step 1: Create the page**

Write to `src/app/(dashboard)/purchases/solicitudes/new/page.tsx`:

```tsx
import { SolicitudForm } from "@/modules/solicitudes/components/SolicitudForm";

export default async function NewSolicitudPage({
  searchParams,
}: {
  searchParams: Promise<{ workOrderId?: string }>;
}) {
  const { workOrderId } = await searchParams;
  return <SolicitudForm initialWorkOrderId={workOrderId} />;
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
cd /Users/francisco/Desktop/metalu && npx tsc --noEmit 2>&1 | grep -E "solicitudes/new/page" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add "src/app/(dashboard)/purchases/solicitudes/new/page.tsx"
git -C /Users/francisco/Desktop/metalu commit -m "feat(purchases): add /purchases/solicitudes/new page hosting SolicitudForm"
```

---

## Task 15: Create `/purchases/solicitudes/[id]` Detail Page

**Files:**
- Create: `src/app/(dashboard)/purchases/solicitudes/[id]/page.tsx`

- [ ] **Step 1: Create the page**

Write to `src/app/(dashboard)/purchases/solicitudes/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getSolicitudById } from "@/modules/solicitudes/services/solicitudService";
import { SolicitudDetailView } from "@/modules/solicitudes/components/SolicitudDetailView";
import { isAdmin } from "@/lib/auth/permissions";

export default async function SolicitudDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return <div className="p-6">No autorizado. Iniciá sesión.</div>;
  }

  const { id } = await params;
  const solicitud = await getSolicitudById(id);
  if (!solicitud) notFound();

  const admin = await isAdmin(session.user.id);

  return (
    <SolicitudDetailView
      solicitud={solicitud as any}
      currentUser={{
        id: session.user.id,
        role: admin ? "admin" : "trabajador",
      }}
    />
  );
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
cd /Users/francisco/Desktop/metalu && npx tsc --noEmit 2>&1 | grep -E "solicitudes/\[id\]/page" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add "src/app/(dashboard)/purchases/solicitudes/[id]/page.tsx"
git -C /Users/francisco/Desktop/metalu commit -m "feat(purchases): add /purchases/solicitudes/[id] detail page

Server component fetches the Solicitud + current user role, passes
both to SolicitudDetailView which handles read display and transition
actions (submit, approve, reject, cancel)."
```

---

## Task 16: SKIPPED — WorkOrderDetailModal does not exist

**Status:** SKIPPED during execution. The referenced file `src/modules/work-orders/components/WorkOrderDetailModal.tsx` does not exist in the codebase — the work-orders module has no detail view (only WorkOrderForm.tsx and WorkOrderTable.tsx). The plan/spec assumed it did, but the underlying component was never built.

**Impact:** The Solicitudes OC integration into the work-orders view is missing. The /purchases page (with Tabs + "Nueva orden de compra" button) and the SolicitudForm's work-order search picker still allow creating solicitudes linked to work orders — just without a dedicated section in the work-order detail view.

**Possible follow-ups (out of scope for this plan):**
1. Build a minimal `WorkOrderDetailModal` (server component) that fetches the work order + related quotations/payments/solicitudes, then re-do this task.
2. Refactor `WorkOrderTable` to receive linked solicitudes via a server-component prop and show them in an expanded row.
3. Add a dedicated "Solicitudes OC" tab/section to the work-orders page.

**Files:**
- (none — task skipped)

- [ ] **Step 1: Read the current file**

```bash
bat /Users/francisco/Desktop/metalu/src/modules/work-orders/components/WorkOrderDetailModal.tsx
```

Take note of the existing sections (e.g. quotations, payments) and find a good spot to add the new "Solicitudes OC" section (e.g. after quotations, before payments, or in a logical place).

- [ ] **Step 2: Add the Solicitudes OC section**

Add the import at the top of the file:
```tsx
import Link from "next/link";
import { getSolicitudes } from "@/modules/solicitudes/services/solicitudService";
```

Then in the body, after the existing detail sections (find a similar pattern to how `quotations` and `payments` are rendered), add:

```tsx
{(await getSolicitudes({ workOrderId: workOrder.id })).length > 0 && (
  <div>
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-semibold">Solicitudes de Orden de Compra</h3>
      <Link
        href={`/purchases/solicitudes/new?workOrderId=${workOrder.id}`}
        className="text-xs text-primary hover:underline"
      >
        + Nueva orden de compra
      </Link>
    </div>
    <div className="space-y-2">
      {(await getSolicitudes({ workOrderId: workOrder.id })).map((s) => (
        <Link
          key={s.id}
          href={`/purchases/solicitudes/${s.id}`}
          className="block p-3 border rounded-md hover:bg-muted"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-sm font-semibold">{s.number}</div>
              <div className="text-xs text-muted-foreground">
                {s.client?.name}
              </div>
            </div>
            <div className="text-xs">{s.status}</div>
          </div>
        </Link>
      ))}
    </div>
  </div>
)}
```

> **Note:** if the existing file uses server-side data loading differently (e.g. props passed from a parent), adapt accordingly. The key requirement is to show linked solicitudes with a "Nueva orden de compra" link that pre-fills `workOrderId`.

- [ ] **Step 3: Typecheck**

Run:
```bash
cd /Users/francisco/Desktop/metalu && npx tsc --noEmit 2>&1 | grep -E "WorkOrderDetailModal" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add src/modules/work-orders/components/WorkOrderDetailModal.tsx
git -C /Users/francisco/Desktop/metalu commit -m "feat(work-orders): add Solicitudes OC section to WorkOrderDetailModal

Lists purchase requests linked to this work order with quick view
links. Adds a 'Nueva orden de compra' button that pre-fills
workOrderId in the new-solicitud form."
```

---

## Task 17: Clean Up `purchaseService.ts` — Remove Mock Fallbacks

**Files:**
- Modify: `src/modules/purchases/services/purchaseService.ts`

- [ ] **Step 1: Replace the file contents**

Write to `src/modules/purchases/services/purchaseService.ts`:

```ts
import { prisma } from "@/lib/prisma/prisma";
import { PurchaseInput } from "../validations/purchaseSchemas";

const INCLUDE_BASE = {
  supplier: { select: { id: true, name: true } },
};

async function nextPurchaseNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `OC-${year}-`;
  const last = await prisma.purchase.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
  });
  const lastSeq = last ? parseInt(last.number.slice(prefix.length), 10) : 0;
  return `${prefix}${String(lastSeq + 1).padStart(3, "0")}`;
}

export async function getPurchases() {
  return prisma.purchase.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: INCLUDE_BASE,
  });
}

export async function getPurchaseById(id: string) {
  return prisma.purchase.findFirst({
    where: { id, deletedAt: null },
    include: INCLUDE_BASE,
  });
}

export async function createPurchase(data: PurchaseInput, userId: string) {
  const number = data.number || (await nextPurchaseNumber());
  return prisma.purchase.create({
    data: {
      number,
      supplierId: data.supplierId,
      status: data.status || "DRAFT",
      subtotal: data.subtotal ?? null,
      tax: data.tax ?? null,
      total: data.total ?? null,
      createdById: userId,
    },
  });
}

export async function updatePurchase(id: string, data: Partial<PurchaseInput>) {
  return prisma.purchase.update({
    where: { id },
    data,
  });
}

export async function deletePurchase(id: string) {
  return prisma.purchase.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
cd /Users/francisco/Desktop/metalu && npx tsc --noEmit 2>&1 | grep -E "purchaseService" | head -20
```

Expected: no errors. (If existing callers pass fields that no longer exist in `PurchaseInput`, they will fail. Adjust as needed — the most common caller is `PurchaseForm`, which only sends `number`, `supplierId`, `status`.)

- [ ] **Step 3: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add src/modules/purchases/services/purchaseService.ts
git -C /Users/francisco/Desktop/metalu commit -m "refactor(purchases): remove mock fallbacks from purchaseService

The try/catch mock fallbacks were hiding real Prisma errors. Now errors
propagate to route handlers. Added nextPurchaseNumber for the
auto-generation pattern (used by Solicitud approve flow)."
```

---

## Task 18: Manual Smoke Test in the Browser

**Files:** None (verification only)

- [ ] **Step 1: Remind the user to restart the dev server**

The dev server has cached the OLD Prisma client. After all the schema changes, the user MUST restart:
```bash
# In the terminal where dev server is running:
Ctrl+C
npm run dev  # or pnpm dev / yarn dev
```

> Without this restart, all `/api/solicitudes` calls will fail with "Cannot read properties of undefined" because the dev server's `prisma` object doesn't know about `solicitudOrdenCompra`.

- [ ] **Step 2: Verify all the endpoints work via the running dev server**

```bash
# Health check: list should return []
curl -s -b cookies.txt http://localhost:3000/api/solicitudes | jq .

# Create a new solicitud
curl -s -b cookies.txt -X POST http://localhost:3000/api/solicitudes \
  -H "Content-Type: application/json" \
  -d '{
    "workOrderId": "<valid-work-order-id>",
    "clientId": "<valid-client-id>",
    "fechaTrabajo": "2026-06-20",
    "fechaEntrega": "2026-06-25"
  }' | jq .
```

Expected: 201 with a new `SolicitudOrdenCompra` object including a `number` like `"SOL-2026-001"`.

- [ ] **Step 3: Run through the full 11-step manual test from the spec**

Open the browser and follow the testing plan from the design spec (section 5):

1. Click "Nueva orden de compra" on `/purchases` → `/purchases/solicitudes/new`
2. Fill the form → GRABAR → redirected to detail
3. Click "Submit for review" → status `EN REVISION`
4. Login as admin → open the detail → fill supplier + items → "Guardar revisión"
5. Click "Aprobar y Emitir" → confirm → status `ORDEN EMITIDA`
6. Switch to "Emitidas" tab → the new PO appears
7. Try to approve another solicitud without supplier → 400 error
8. Login as non-admin → try to approve → 403
9. Open a `EN_REVISION` solicitud as admin → "Rechazar" + reason → status `RECHAZADA`
10. Try to delete a `ORDEN_EMITIDA` solicitud → 409 error
11. Open a Work Order detail → see the "Solicitudes OC" section

- [ ] **Step 4: Final commit (no code changes — just confirmation)**

```bash
git -C /Users/francisco/Desktop/metalu log --oneline -20
```

Verify all 18 tasks have commits in the log. If anything is missing, go back and complete it.

- [ ] **Step 5: (Optional) Push to GitHub**

If the user wants the work on GitHub:
```bash
git -C /Users/francisco/Desktop/metalu push origin main
```

---

## Done

All 18 tasks complete. The Purchase Request module is implemented:
- New `SolicitudOrdenCompra` + `SolicitudItem` Prisma models with workflow status enum
- 6 service functions, 3 API routes (with transitions endpoint for state machine)
- `SolicitudForm` matching the design mockup
- `SolicitudReviewForm` for admin paso 2
- Tabs in `/purchases` (Emitidas + Solicitudes)
- "Nueva orden de compra" button → `/purchases/solicitudes/new`
- "Solicitudes OC" section in WorkOrder detail
- All transitions gated by role + status
- 19% tax calc, days-since-OC auto-calc, sequential number generation

**Out of scope (deliberately, per spec):**
- Decorative blue image on the form (placeholder can be added later)
- Purchase direct creation (must go through Solicitud → Approve)
- Multi-PO per Solicitud
- Notifications on status change
- Audit log of transitions
