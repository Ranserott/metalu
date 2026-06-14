# Client Encargados (Contacts) Module — Design

**Date:** 2026-06-13
**Status:** Approved (pending user review of written spec)
**Author:** brainstorm session with user

## Goal

Add an "Encargado" (contact person) sub-resource to the Client module so the metalúrgica can track which person represents each client, and link that person to a work order when they show up to request work on the client's behalf. The encargado has their own identity (RUT, name, contact info, position) but is always bound to a single main client.

The driving use case: a client sends a contact to drop off materials or request a work order. Today the work order's "Entregado Por" and "Encargado" fields are free-text, so there's no traceability between the contact and the client. Encargados fix that.

## Context (Current State)

- **Prisma `Client` model** has a free-text `contact String?` field (the "primary contact" quick reference), plus `email` and `phone`. No relation to a contacts table.
- **WorkOrder model** has `entregadoPor String?` and `encargado String?` — both free-text. No FK to a contacts table.
- **ClientDetailModal** (`src/modules/clients/components/ClientDetailModal.tsx`) shows client info, the last quotations, and the last payments. No section for contacts.
- **WorkOrderForm** has the "Entregado Por" field (recently changed to a free-text input) and an "Encargado" select with hardcoded values. Neither links to a real person record.
- **Existing patterns**: every module in the project has a parallel structure: `services/`, `validations/`, `types/`, `components/`, plus API route handlers under `src/app/api/<module>/`. The `quotations` and `clients` modules are the closest references.

## Design

### 1. Data Model

New `Encargado` model in Prisma:

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

**Decisions**:
- `rut` is **globally unique** (with `deletedAt: null` filter applied in the service, so re-creating a soft-deleted encargado with the same RUT is allowed). A person has one RUT; if they move between clients, the service updates `clientId` rather than creating a new record.
- `position` is a free-text field (the user wants "Cargo" but does not want a fixed catalog at MVP).
- Soft delete via `isActive` + `deletedAt`, consistent with `Client`, `Quotation`, `WorkOrder`.
- **Cascade** on `clientId`: if the client is hard-deleted, the encargdos go with them. (Soft delete of a client does not affect encargdos — the encargados keep their history.)
- `createdById` follows the same audit pattern as other entities.

**Modifications to existing models**:
- `Client`: add `encargados Encargado[]`
- `WorkOrder`: add `encargadoId String? @map("encargado_id")` + `encargadoRef Encargado? @relation(fields: [encargadoId], references: [id], onDelete: SetNull)`. **The relation is named `encargadoRef` (NOT `encargado`)** because `WorkOrder` already has a legacy free-text `encargado String?` field used as a static dropdown. The legacy field stays untouched at MVP — it prefills with the selected encargado's name on selection, and existing reports / printouts keep reading it. The new selector is the canonical link.
- `User`: add `encargadosCreated Encargado[] @relation("EncargadoCreator")`

**Migration**: `prisma migrate dev --name add_encargados_module`

### 2. Backend (API + Service)

**New files**:

```
src/app/api/encargados/route.ts           # GET, POST
src/app/api/encargados/[id]/route.ts      # GET, PATCH, DELETE
```

**Endpoints**:

| Method | Path                              | Body                  | Returns                                |
| ------ | --------------------------------- | --------------------- | -------------------------------------- |
| GET    | `/api/encargados?clientId={id}`   | —                     | `Encargado[]` (filtered if `clientId`) |
| POST   | `/api/encargados`                 | `EncargadoInput`      | Created `Encargado`                    |
| GET    | `/api/encargados/:id`             | —                     | One `Encargado`                        |
| PATCH  | `/api/encargados/:id`             | Partial `EncargadoInput` | Updated `Encargado`                 |
| DELETE | `/api/encargados/:id`             | —                     | `{ success: true }` (soft delete)      |

**Service** (`src/modules/encargados/services/encargadoService.ts`):
- `getEncargados({ clientId? } = {})` — Prisma query with `where: { deletedAt: null, ...(clientId && { clientId }) }`, includes `client: { select: { id, name, code } }`, orders by `name asc`.
- `getEncargadoById(id)` — same include, filters by `deletedAt: null`.
- `createEncargado(data, userId)`:
  - Validates the referenced client exists and is not soft-deleted.
  - Checks RUT uniqueness against active (`deletedAt: null`) encargdos → throws `Error("Ya existe un encargado con ese RUT")` if duplicate (caller returns 409).
  - Otherwise creates with `createdById: userId`.
- `updateEncargado(id, data)`:
  - Validates client exists if `clientId` is being changed.
  - Re-checks RUT uniqueness if `rut` is changing (excluding the current record).
- `deleteEncargado(id)` — soft delete via `deletedAt = new Date()`. **Refuses** if the encargado has non-cancelled work orders linked (counts where `workOrders.some(w => !w.deletedAt)`); throws an error so the UI can show "tiene [N] trabajos asociados, no se puede eliminar".

**Validation** (`src/modules/encargados/validations/encargadoSchemas.ts` with Zod):
```ts
EncargadoSchema = z.object({
  rut: z.string().min(1, "RUT requerido"),
  name: z.string().min(1, "Nombre requerido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  position: z.string().optional(),
  clientId: z.string().min(1, "Cliente requerido"),
});
```

RUT uniqueness is enforced in the service (so we can return a clean 409 with a Spanish message), not in Zod.

**Type** (`src/modules/encargados/types/encargado.ts`):
```ts
type Encargado = {
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
};
```

### 3. UI — Clients Module

**`EncargadoListSection` component** — new section inside `ClientDetailModal` (between the existing info card and the quotations/payments lists):

- Header: "Encargados" with an "Agregar encargado" button on the right.
- Body: list of rows. Each row shows: name (bold), RUT, position (small caps, gray), email + phone (muted). Right side: edit (pencil) and toggle-active (power) icons.
- Empty state: "No hay encargados registrados para este cliente" with a hint to click "Agregar encargado".
- Toggle inactive on a row: same `ConfirmDialog` pattern as `ClientTable` (only confirm on deactivate, silent activate on inactive rows).
- The section re-fetches its data when the modal opens or when an action completes.

**`EncargadoForm` component** — modal form, used for both create and edit:

- Fields:
  - **RUT** (text, required)
  - **Nombre** (text, required)
  - **Email** (text, optional, validated as email)
  - **Teléfono** (text, optional)
  - **Cargo** (text, optional)
  - **Cliente** (selector, required, searchable by RUT/code or name) — uses the existing `Select` primitive; when opened from a client detail modal, the value is pre-set and the field is disabled.
- Submit:
  - POST for create, PATCH for edit.
  - On 409 (RUT duplicate) shows the server error message inline.
  - On success, closes the modal and triggers the list refresh in the parent.
- `key={edit?.id ?? "new"}` to force remount on target change (same pattern as `ClientForm`).

**Modify `ClientDetailModal`**: add `<EncargadoListSection clientId={client.id} clientCode={client.code} clientName={client.name} />` after the existing info block, before the quotations/payments section.

### 4. UI — Work-Orders Module

**Modify `WorkOrderForm`**: add an "Encargado" selector field in the "Detalles de Operación" card (next to or below "Encargado" free-text — they coexist at MVP: the new selector is the canonical link, the legacy text field is kept for now and prefills with the selected encargado's name on selection).

- The selector is a `Select` populated from `GET /api/encargados`.
- Renders as a combobox with search: when the user types, the list filters by name, RUT, or client name.
- Grouped by client: each `SelectItem` shows `[client.name] → name (RUT)`.
- An "Agregar nuevo encargado" option at the bottom that opens the same `EncargadoForm` modal (targeting the currently selected client in the work order). If no client is selected yet, it prompts to select a client first.
- On selection, set `encargadoId` in form state and **also** set the legacy `encargado` text to the encargado's name (so existing reports / printouts that read the text field keep working).

**Modify `WorkOrder` type and Zod schema** to include `encargadoId: string | null`.

**Modify `WorkOrderService.createWorkOrder` / `updateWorkOrder`** to accept and persist `encargadoId`.

**WorkOrderTable** (display side, optional MVP+1): add a column "Encargado" showing the linked encargado's name. Skip in v1 if it crowds the table; revisit.

### 5. Error Handling

| Case | Surface | Response |
|------|---------|----------|
| Session missing | API | 401 `{ error: "Unauthorized" }` |
| Invalid body (Zod fail) | API | 400 `{ error: <issues> }` |
| RUT already exists | API | 409 `{ error: "Ya existe un encargado con ese RUT" }` |
| Client not found / soft-deleted | API | 400 `{ error: "Cliente inválido" }` |
| Encargado has linked work orders (delete attempt) | API | 409 `{ error: "Tiene N trabajos asociados, no se puede eliminar" }` |
| Encargado not found | API | 404 |
| Form submit fails | UI | Inline error message from `errorData.error`; alert only for unexpected errors |

### 6. Testing

Manual test plan, in order:

1. **Migration**: `npx prisma migrate dev --name add_encargados_module` runs cleanly. Existing data is preserved. `Encargado` table exists; `clients.encargados`, `work_orders.encargado_id`, and `users.encargados_created` relations are present.
2. **Create**: from a client detail modal, click "Agregar encargado", fill all 5 fields, save. Row appears in the list with the entered data.
3. **RUT duplicate**: try to create another encargado with the same RUT (different client). Server returns 409, form shows "Ya existe un encargado con ese RUT" inline.
4. **Edit**: click the pencil icon, change the position, save. List reflects the change.
5. **Toggle active**: click the power icon on an active row → confirm dialog → confirm → row marks inactive. Re-click → silently reactivates.
6. **Delete with linked work orders**: link the encargado to a work order (step 7), then try to delete the encargado from the client detail. Server returns 409; the UI shows the message.
7. **Work-order link**: open a new work order form for the same client, open the Encargado selector, search by name, pick the encargado, save. The work order is created with `encargadoId` set. Open the work order (if/when the read view exists) and confirm the link persists.
8. **Encargado selector search**: type a partial name in the selector; results filter live. Type a RUT; results filter by RUT.
9. **Soft delete safety**: deactivate a client, then check the encargdos — they still exist (cascade only applies to hard delete, which is not used in this app).
10. **Auth**: hit any endpoint without a session → 401.

## Files Touched

**Create**:
- `prisma/migrations/{timestamp}_add_encargados_module/migration.sql` (auto)
- `src/modules/encargados/services/encargadoService.ts`
- `src/modules/encargados/validations/encargadoSchemas.ts`
- `src/modules/encargados/types/encargado.ts`
- `src/modules/encargados/components/EncargadoListSection.tsx`
- `src/modules/encargados/components/EncargadoForm.tsx`
- `src/modules/encargados/components/EncargadoSelector.tsx`
- `src/app/api/encargados/route.ts`
- `src/app/api/encargados/[id]/route.ts`

**Modify**:
- `prisma/schema.prisma` (Encargado model + Client/WorkOrder/User relations)
- `src/modules/clients/components/ClientDetailModal.tsx` (add EncargadoListSection)
- `src/modules/work-orders/components/WorkOrderForm.tsx` (add EncargadoSelector)
- `src/modules/work-orders/types/workOrder.ts` (add `encargadoId`)
- `src/modules/work-orders/validations/workOrderSchemas.ts` (add `encargadoId`)
- `src/modules/work-orders/services/workOrderService.ts` (persist `encargadoId`)

## Out of Scope (deliberately)

- Hard delete of encargdos (soft delete only).
- A "primary contact" flag on `Client` (the existing free-text `contact` field stays; we don't auto-link it).
- Encargado history (who changed what when) beyond the audit-style `createdById`.
- A standalone `/encargados` page (encargdos are only ever managed through a client's context, or selected from a work-order form).
- Per-encargado permissions (any user with clients access can CRUD encargdos; defer until RBAC is centralized).
