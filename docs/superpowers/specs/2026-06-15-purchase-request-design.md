# Purchase Request (Solicitud de Orden de Compra) — Design

**Date:** 2026-06-15
**Status:** Approved (pending user review of written spec)
**Author:** brainstorm session with user

## Goal

Add a "Solicitud de Orden de Compra" (Purchase Request) workflow to the metalúrgica's purchasing process. A user initiates a request from a Work Order, fills the basic form, submits it for review, and an admin reviews + approves it. On approval, a real `Purchase` record is created and appears in the `/purchases` table.

The driving need: today there is no traceability between a Work Order and a Purchase Order. Users want a clear "approval gate" so that purchases go through management review before being issued. The new entity (`SolicitudOrdenCompra`) is the artifact that carries that workflow.

## Context (Current State)

- **`/purchases` page** exists but is minimal: just a heading, subtitle, and a `PurchaseTable`. **No "Nueva orden de compra" button**, no actions, no API.
- **`PurchaseTable`** has columns: number, supplierId, status, total, fecha. Uses the generic `DataTable`.
- **No `/api/purchases` route** exists in `src/app/api/`.
- **`PurchaseForm`** is a stub with just `number` and `supplierId` — never actually wired up to a real submit.
- **`purchaseService.ts`** has a try/catch that silently falls back to mock data on Prisma failure. Bad pattern; cleanup pending.
- **`Purchase` model** in Prisma: id, number (unique), supplierId, status (DRAFT/SENT/PARTIAL/RECEIVED/CANCELLED), subtotal/tax/total (Decimals), audit fields, soft delete. No relation to `WorkOrder` or `SolicitudOrdenCompra` (yet).
- **`WorkOrder` model** has many denormalized header fields (entregadoPor, fechaTrabajo, fechaEntrega, condicionesPago, etc.) and a relation to `Client`. It does NOT have a relation to `Purchase` or `SolicitudOrdenCompra` (yet).
- **Auth/Roles**: there is an `admin` role (full access) and a `trabajador` role (dashboard only). Permission checks use `permissions.ts`.

## Design

### 1. Data Model

**New `SolicitudOrdenCompra` model:**

```prisma
model SolicitudOrdenCompra {
  id              String                  @id @default(uuid())
  number          String                  @unique               // SOL-2026-001, auto-generated
  workOrderId     String                  @map("work_order_id")
  clientId        String                  @map("client_id")     // denormalized from work order
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

  // Review fields (filled in paso 2 — admin)
  supplierId       String?                 @map("supplier_id")
  subtotal         Decimal?                @db.Decimal(12, 2)
  tax              Decimal?                @db.Decimal(12, 2)
  total            Decimal?                @db.Decimal(12, 2)
  discount         Decimal?                @default(0) @db.Decimal(12, 2)
  discountType     SolicitudDiscountType?  @default(NONE) @map("discount_type")

  workOrder WorkOrder              @relation(fields: [workOrderId], references: [id], onDelete: Restrict)
  client    Client                 @relation(fields: [clientId], references: [id], onDelete: Restrict)
  supplier  Supplier?              @relation(fields: [supplierId], references: [id], onDelete: SetNull)
  purchase  Purchase?              @relation("SolicitudPurchase", fields: [purchaseId], references: [id], onDelete: SetNull)
  createdBy User?                  @relation("SolicitudCreator", fields: [createdById], references: [id])
  rejectedBy User?                 @relation("SolicitudRejecter", fields: [rejectedById], references: [id])
  items     SolicitudItem[]

  rejectionReason String?   @map("rejection_reason")
  rejectedById    String?   @map("rejected_by_id")
  rejectedAt      DateTime? @map("rejected_at")

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

**Modifications to existing models:**

- `Purchase`: add `solicitud SolicitudOrdenCompra? @relation("SolicitudPurchase")` (back-relation auto-resolved by Prisma)
- `WorkOrder`: add `solicitudesOC SolicitudOrdenCompra[]`
- `Client`: add `solicitudesOC SolicitudOrdenCompra[]`
- `User`: add `createdSolicitudes SolicitudOrdenCompra[] @relation("SolicitudCreator")` and `rejectedSolicitudes SolicitudOrdenCompra[] @relation("SolicitudRejecter")`
- `Supplier`: add `solicitudes SolicitudOrdenCompra[]`

**Decisions:**

- `purchaseId` is **nullable + unique**: a Solicitud can only ever produce one Purchase (1:1). When the Purchase is hard-deleted, the FK goes null but the Solicitud keeps its history.
- `diasSinOC` defaults to 0 and is auto-calculated at create time as `max(0, days(today - fechaTrabajo))`. Stored on the record so the user can override it manually.
- `clientId` is **denormalized** from `workOrderId` (not derived on read) so the form has it directly without an extra join. Cascade Restrict prevents deletion of an OT or client that has active solicitudes.
- `SOL-YYYY-NNN` number is auto-generated in the service (counter per year), same pattern as `Quotation.number`.
- **Status enum** has 5 states: 3 in the visible workflow + RECHAZADA + CANCELADA. The 3 visible states map 1:1 to the steps in the "Purchase Workflow" card on the form.
- **Soft delete** via `deletedAt` consistent with the rest of the project. Hard delete is not used.

**Migration**: `prisma migrate dev --name add_solicitudes_orden_compra`

### 2. Backend (API + Service)

**New files:**

```
src/app/api/solicitudes/route.ts                          # GET, POST
src/app/api/solicitudes/[id]/route.ts                     # GET, PATCH, DELETE
src/app/api/solicitudes/[id]/transitions/route.ts         # POST
```

**Endpoints:**

| Method | Path                                       | Body                                 | Returns                                                |
| ------ | ------------------------------------------ | ------------------------------------ | ------------------------------------------------------ |
| GET    | `/api/solicitudes?status=&workOrderId=`    | —                                    | `Solicitud[]` (filtered)                               |
| POST   | `/api/solicitudes`                          | `SolicitudInput` (paso 1 fields)     | Created `Solicitud`                                    |
| GET    | `/api/solicitudes/:id`                      | —                                    | One `Solicitud` with items + relations                 |
| PATCH  | `/api/solicitudes/:id`                      | `Partial<SolicitudInput>`            | Updated `Solicitud`                                    |
| DELETE | `/api/solicitudes/:id`                      | —                                    | `{ success: true }` (soft delete)                      |
| POST   | `/api/solicitudes/:id/transitions`         | `{ action, reason? }`                | Updated `Solicitud` (+ `purchaseId` on `approve`)      |

`action` values for the transitions endpoint: `"submit"`, `"approve"`, `"reject"`, `"cancel"`. `reason` is required when `action = "reject"`.

**Service** (`src/modules/solicitudes/services/solicitudService.ts`):

- `getSolicitudes({ status?, workOrderId? } = {})` — filters by `deletedAt: null` and any provided filter; includes `workOrder: { select: { number, title } }`, `client: { select: { name, code } }`, `supplier: { select: { name } }`; orders by `createdAt desc`.
- `getSolicitudById(id)` — same includes + `items: { where: { deletedAt: null }, orderBy: { createdAt asc } }`.
- `createSolicitud(data, userId)`:
  - Generates next `SOL-YYYY-NNN` (count existing with same year prefix, increment).
  - Calculates `diasSinOC = max(0, days(now - data.fechaTrabajo))`.
  - Validates `workOrderId` exists and is not soft-deleted.
  - Validates `clientId` exists and is not soft-deleted.
  - Creates with `status = SOLICITUD_GENERADA`, `createdById: userId`.
- `updateSolicitud(id, data, userId)`:
  - Allows edits to paso 1 fields only when `status = SOLICITUD_GENERADA` and the user is the creator or admin.
  - Allows edits to review fields (supplier, items, totals) only when `status = EN_REVISION` and the user is admin.
  - Recalculates `diasSinOC` if `fechaTrabajo` changes.
  - Recalculates `subtotal/tax/total` if `items` change (sum of items, tax 19% in Chile, discounts apply).
- `transitionSolicitud(id, action, userId, reason?)`:
  - **`submit`**: `SOLICITUD_GENERADA → EN_REVISION`. Allowed for creator or admin. No side effects.
  - **`approve`** (admin only): `EN_REVISION → ORDEN_EMITIDA`. **Side effects** (in a single Prisma transaction):
    1. Validate `supplierId` is set and `items.length > 0`. If not, throw `Error("Falta seleccionar proveedor y al menos 1 item antes de aprobar")` → 400.
    2. Generate `OC-YYYY-NNN` for the Purchase (counter per year, format matches `Quotation.number`).
    3. Create `Purchase` with: `number`, `supplierId`, `subtotal`, `tax`, `total`, `discount`, `discountType`, **`status = SENT`** (the PO is being issued to the supplier, not just drafted), `workOrderId = solicitud.workOrderId`, `clientId = solicitud.clientId`, `createdById: userId` (the approver).
    4. Create one `PurchaseItem` per `SolicitudItem`, copying description, quantity, unitPrice, total.
    5. Set `solicitud.purchaseId` to the new Purchase id.
    6. Set `solicitud.status = ORDEN_EMITIDA`.
  - **`reject`** (admin only): `EN_REVISION → RECHAZADA`. Sets `rejectionReason`, `rejectedById = userId`, `rejectedAt = now()` on the Solicitud. No side effects on other tables.
  - **`cancel`** (creator or admin): `SOLICITUD_GENERADA | EN_REVISION → CANCELADA`. No side effects.
  - All other transitions throw `Error("Transición no permitida: <from> → <action>")` → 400.
- `deleteSolicitud(id, userId)` — soft delete. Allowed for creator or admin. **Refuses** if `status = ORDEN_EMITIDA` (throws `Error("No se puede eliminar una solicitud ya emitida")` → 409).

**Validation** (`src/modules/solicitudes/validations/solicitudSchemas.ts`):

```ts
// Paso 1 — used on POST and on PATCH when status = SOLICITUD_GENERADA
SolicitudSchema = z.object({
  workOrderId: z.string().min(1, "Trabajo requerido"),
  clientId:    z.string().min(1, "Cliente requerido"),
  fechaTrabajo: z.coerce.date(),
  fechaEntrega: z.coerce.date(),
  diasSinOC:   z.number().int().min(0).optional(),
  solicitud1:  z.coerce.date().optional().nullable(),
  solicitud2:  z.coerce.date().optional().nullable(),
  solicitud3:  z.coerce.date().optional().nullable(),
  notasInternas: z.string().optional(),
});

// Paso 2 — used on PATCH when status = EN_REVISION
SolicitudReviewSchema = z.object({
  supplierId: z.string().min(1, "Proveedor requerido"),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity:    z.coerce.number().positive(),
    unitPrice:   z.coerce.number().nonnegative(),
  })).min(1, "Al menos un item requerido"),
  discount:     z.coerce.number().nonnegative().optional(),
  discountType: z.enum(["NONE", "AMOUNT", "PERCENT"]).optional(),
});
```

**Type** (`src/modules/solicitudes/types/solicitud.ts`):

```ts
type SolicitudOrdenCompra = {
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
  status: "SOLICITUD_GENERADA" | "EN_REVISION" | "ORDEN_EMITIDA" | "RECHAZADA" | "CANCELADA";
  supplierId: string | null;
  supplier: { name: string } | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  discount: number | null;
  discountType: "NONE" | "AMOUNT" | "PERCENT" | null;
  purchaseId: string | null;
  rejectionReason: string | null;
  items: SolicitudItem[];
  createdAt: Date;
  updatedAt: Date;
};
```

### 3. UI

**Routing:**

| Route | Component | Purpose |
| --- | --- | --- |
| `/purchases` | `PurchasesTabs` (modified) | Main page with tabs |
| `/purchases/solicitudes/new` | `SolicitudForm` | Paso 1 form (the image) |
| `/purchases/solicitudes/[id]` | `SolicitudDetailView` | Detail + review form (paso 2 if admin) |
| `/purchases/solicitudes/[id]/emit` | (redirect to detail, action via POST) | Emisión confirmada |

**`PurchasesTabs` — modify `/purchases` page:**

```tsx
<Tabs defaultValue="emitidas">
  <TabsList>
    <TabsTrigger value="emitidas">Emitidas</TabsTrigger>
    <TabsTrigger value="solicitudes">Solicitudes</TabsTrigger>
  </TabsList>
  <TabsContent value="emitidas">
    <EmitidasTable data={emitidas} /> {/* extracted from existing PurchaseTable */}
  </TabsContent>
  <TabsContent value="solicitudes">
    <SolicitudesTable data={solicitudes} />
  </TabsContent>
</Tabs>
<div className="flex justify-end">
  <Link href="/purchases/solicitudes/new">
    <Button>+ Nueva orden de compra</Button>
  </Link>
</div>
```

**`SolicitudesTable`** — columns: `number`, `workOrder.number`, `client.name`, `status` (badge), `supplier.name` (or "—"), `fechaTrabajo`, `diasSinOC`, actions (view). Default sort: `createdAt desc`.

**`SolicitudForm` (paso 1) — the image:**

Two-column layout (grid `lg:grid-cols-3` with main `col-span-2`):

- **Header**: title "Solicitud de Orden de Compra", subtitle "Complete details to initiate a purchase order request.", status badge "STATUS: SOLICITUD GENERADA" top-right (blue).
- **Card 1 — "Detalles del Trabajo"** (with `Info` icon):
  - `TRABAJO N°` — Input with `bg-yellow-50` background (matches image), search button + person icon to open client/work-order picker. Placeholder `"34250"`.
  - `RUT CLIENTE` — Input with search icon and person icon. Opens a popover with client search (filter by RUT/code/name). On select, fills `clientId` and `Nombre del Cliente`.
  - `NOMBRE DEL CLIENTE` — Input, full-width, read-only when populated by client picker.
  - `FECHA TRABAJO` + `FECHA ENTREGA TRABAJO` — `<input type="date">` (or `DatePicker` if shadcn has it) side-by-side.
  - `DÍAS SIN ORDEN DE COMPRA` — Input `type="number"`, read-only (auto-calculated).
- **Card 2 — "Fechas de Solicitud"** (with `Calendar` icon):
  - 3 `<input type="date">` side-by-side: `SOLICITUD 1`, `SOLICITUD 2`, `SOLICITUD 3`.
- **Right column** (`col-span-1`):
  - **Card 3 — "PURCHASE WORKFLOW"**: 3 numbered steps:
    1. "Solicitud Generada" — active (blue)
    2. "Revisión de Gerencia" — pending (gray)
    3. "Orden Emitida" — pending (gray)
    Each step shows label + status sub-label ("Current Step" / "Pending"). Renders based on `solicitud.status`.
  - **Card 4 — "NOTAS INTERNAS"**: textarea with placeholder "Add relevant information about this request...".
  - (Decorative image — the metalúrgic-looking blue gradient photo from the mockup — **omitted at MVP**; we can add a placeholder `Image` or a small illustration of a workbench later.)
- **Action bar** (sticky bottom): `LIMPIA` (secondary), `BORRAR` (outline red), `GRABAR` (primary), `SALIR` (dark, links back to /purchases).

Submit on GRABAR: POST to `/api/solicitudes`, on 200 navigate to `/purchases/solicitudes/[newId]`.

**`SolicitudDetailView` (paso 2 + read-only paso 1):**

- Top: header with number, status badge, link back to /purchases.
- Paso 1 cards: rendered as **read-only** (Input becomes plain text, dates formatted, no edit affordance).
- New card — **"Revisión de Gerencia"** (only visible if `user.role === 'admin' && status === 'EN_REVISION'`):
  - Supplier selector (combobox over `/api/suppliers`).
  - Items table — same pattern as `PurchaseForm` items: description, quantity, unit price, total (auto-calc), add/remove row.
  - Totals block: subtotal (sum), tax (19% of subtotal), discount (amount or percent), total.
  - "Guardar revisión" button — PATCHes the review fields, status stays `EN_REVISION`.
- "Decisión" card (only visible if `status === 'EN_REVISION'` and admin):
  - "Rechazar" — opens dialog with reason textarea → POST `/transitions` with `{ action: 'reject', reason }`.
  - "Aprobar y Emitir" — opens confirm dialog (lists the supplier + total) → POST `/transitions` with `{ action: 'approve' }`.
- If `status === 'SOLICITUD_GENERADA'` and the user is the creator: show "Submit for review" button.
- If `status === 'ORDEN_EMITIDA'`: show a "PO Emitida" banner with link to `/purchases/[purchaseId]` (which renders the existing Purchase detail, or just the row in the table for now).
- If `status === 'RECHAZADA'` or `'CANCELADA'`: show banner with reason (if any) and cancel button only if admin/creator.

**`SolicitudItemsTable`** — shared component used in the review form. Pattern matches `PurchaseForm` items: `description`, `quantity`, `unitPrice`, `total = quantity * unitPrice`. Add/remove row. Computes subtotal in the parent.

**`WorkOrder` detail modification** — new section "Purchase Requests":

- Lists all `solicitudesOC` linked to this OT (number, status badge, supplier, total if emitted).
- "Nueva orden de compra" button that navigates to `/purchases/solicitudes/new?workOrderId={id}` (the form reads the query param to pre-populate `workOrderId` and `clientId`).

**`/purchases` page data loading:**

The page is currently a server component that fetches `getPurchases()`. We change it to fetch **both** `getPurchases()` (for the "Emitidas" tab) and `getSolicitudes({})` (for the "Solicitudes" tab) in parallel via `Promise.all`, then pass both to the client `PurchasesTabs` component.

**Existing `purchaseService.ts` cleanup:** remove the `try/catch` mock-data fallbacks. They hide real Prisma errors and provide a false sense of safety. Errors should propagate to the route handler so they can return 500 with a clear message.

### 4. Error Handling

| Case | Surface | Response |
| --- | --- | --- |
| Session missing | API | 401 `{ error: "Unauthorized" }` |
| Invalid body (Zod fail) | API | 400 `{ error: <issues> }` |
| Invalid status transition | API | 400 `{ error: "Transición no permitida: SOLICITUD_GENERADA → approve" }` |
| Approve without supplier/items | API | 400 `{ error: "Falta seleccionar proveedor y al menos 1 item antes de aprobar" }` |
| Non-admin trying to approve/reject | API | 403 `{ error: "Solo administradores pueden aprobar o rechazar" }` |
| Non-creator non-admin trying to edit/cancel | API | 403 `{ error: "No tienes permiso para esta acción" }` |
| Solicitud not found | API | 404 `{ error: "No encontrado" }` |
| Delete emitted solicitud | API | 409 `{ error: "No se puede eliminar una solicitud ya emitida" }` |
| Submit form fails (network) | UI | Inline error message from `errorData.error`; alert only for unexpected errors |

### 5. Testing (manual smoke test)

1. **Create**: en `/purchases` tab "Solicitudes", click "Nueva orden de compra" → `/purchases/solicitudes/new` → llenar form (Trabajo N°, RUT Cliente, fechas) → GRABAR. Aparece en tab "Solicitudes" con status `SOLICITUD GENERADA`.
2. **Submit**: abrir la solicitud, click "Submit for review" → status pasa a `EN REVISION`. Aparece badge en la tabla.
3. **Admin review (login como admin)**: abrir la solicitud, completar supplier + items + totales → "Guardar revisión" (status sigue `EN_REVISION`). Recargar, los datos se mantienen.
4. **Approve**: en la misma vista, click "Aprobar y Emitir" → confirm dialog → status pasa a `ORDEN EMITIDA`. Tab "Emitidas" muestra el PO nuevo. Purchase detail abre OK con todos los datos.
5. **Approve sin supplier**: intentar aprobar una solicitud sin `supplierId` → 400 con mensaje claro.
6. **Approve como no-admin**: login como trabajador, intentar aprobar → 403.
7. **Reject**: abrir una solicitud `EN_REVISION` como admin, click "Rechazar" + motivo → status pasa a `RECHAZADA`. Ya no aparece como accionable.
8. **Cancel**: como creator, cancelar una solicitud `SOLICITUD_GENERADA` → status pasa a `CANCELADA`.
9. **Delete emitted**: intentar eliminar una solicitud `ORDEN_EMITIDA` → 409 con mensaje.
10. **Delete non-emitted**: como creator, eliminar una solicitud `SOLICITUD_GENERADA` → soft delete OK, no aparece más.
11. **WorkOrder detail**: abrir una OT, sección "Purchase Requests" muestra las solicitudes vinculadas. Botón "Nueva orden de compra" pre-pobla el form con el `workOrderId`.

## Files Touched

**Create**:
- `prisma/migrations/{timestamp}_add_solicitudes_orden_compra/migration.sql` (auto)
- `src/modules/solicitudes/services/solicitudService.ts`
- `src/modules/solicitudes/validations/solicitudSchemas.ts`
- `src/modules/solicitudes/types/solicitud.ts`
- `src/modules/solicitudes/components/SolicitudForm.tsx`
- `src/modules/solicitudes/components/SolicitudReviewForm.tsx`
- `src/modules/solicitudes/components/SolicitudesTable.tsx`
- `src/modules/solicitudes/components/SolicitudDetailView.tsx`
- `src/modules/solicitudes/components/SolicitudItemsTable.tsx`
- `src/modules/solicitudes/components/TransitionDialogs.tsx`
- `src/app/api/solicitudes/route.ts`
- `src/app/api/solicitudes/[id]/route.ts`
- `src/app/api/solicitudes/[id]/transitions/route.ts`
- `src/app/(dashboard)/purchases/solicitudes/new/page.tsx`
- `src/app/(dashboard)/purchases/solicitudes/[id]/page.tsx`

**Modify**:
- `prisma/schema.prisma` (SolicitudOrdenCompra, SolicitudItem, enums, relations on WorkOrder/Client/Purchase/Supplier/User)
- `src/app/(dashboard)/purchases/page.tsx` (add Tabs)
- `src/modules/purchases/services/purchaseService.ts` (remove mock fallbacks, return Prisma data)
- `src/modules/work-orders/components/WorkOrderDetailModal.tsx` (add Purchase Requests section)
- (Optional) `src/modules/purchases/components/PurchaseTable.tsx` (rename to `EmitidasTable` for clarity, or keep the name)

## Out of Scope (deliberately)

- Purchase directo sin pasar por Solicitud (todo PO viene de Solicitud aprobada).
- Notificaciones automáticas cuando cambia status.
- Historial de transiciones (audit log) más allá de `createdById` + `rejectedById`.
- Comentarios / threaded discussion en la solicitud.
- Edición post-emisión: una solicitud `ORDEN_EMITIDA` es inmutable. Si hay que cambiar el PO, se edita el `Purchase` directamente.
- Multi-PO por solicitud (1 Solicitud → 1 Purchase, enforced by `@unique` en `purchaseId`).
- Sección "Purchase Requests" en `ClientDetailModal` (solo se agrega en `WorkOrder` detail, como pediste).
- Decorative image (metalúrgic blue gradient) en el form — se omite, se puede agregar en una iteración futura.
- Auto-llenar el form con datos del work order: el admin que revisa debe poder ajustar libremente, no se fuerza a que coincida exactamente.
