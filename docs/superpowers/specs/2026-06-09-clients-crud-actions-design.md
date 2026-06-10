# Clients CRUD Actions — Design

**Date:** 2026-06-09
**Status:** Approved (pending user review of written spec)
**Author:** brainstorm session with user

## Goal

Add three missing actions to the clients list at `/clients`:
1. **View details** (eye icon → read-only modal)
2. **Edit** (pencil icon → form in edit mode, pre-filled)
3. **Deactivate / Activate** (power icon → toggle `isActive`, with confirm dialog only when deactivating)

No hard delete — soft state (`isActive`) is the only "removal" mechanism. The existing `deletedAt` field is left untouched for future use.

## Context (Current State)

- **Prisma `Client` model** has `isActive Boolean @default(true)` and `deletedAt DateTime?` — both already exist.
- **API** `src/app/api/clients/route.ts` only has `GET` and `POST`. No `[id]/route.ts` exists.
- **Service** `clientService.ts` has `getClients`, `getClientById`, `createClient`, `updateClient`, `deleteClient`. The `deleteClient` function (soft delete via `deletedAt`) is unused and **stays unused** for this change.
- **Table** `ClientTable.tsx` has no actions column. The row click does `router.push('/clients/{id}')` to a non-existent page — this gets removed.
- **Form** `ClientForm.tsx` already accepts `defaultValues` and `editMode` props in its type, but the implementation doesn't use them yet.

## Design

### 1. UX (columna de acciones en la tabla)

Inline icons in a new "Acciones" column. Matches the pattern of other tables in the project (`PaymentTable`, `PurchaseTable`, `QuotationTable`).

Three icons, in this order:

| # | Icon | Action | Color | Behavior |
|---|------|--------|-------|----------|
| 1 | `Eye` | Ver detalles | Blue (outline) | Opens read-only `ClientDetailModal` |
| 2 | `Pencil` | Editar | Blue (outline) | Opens `ClientForm` in edit mode, pre-filled |
| 3 | `Power` | Activar/Desactivar | Green (inactive) / Red (active) | Toggle `isActive` |

**Toggle rules:**
- Active client → click → **ConfirmDialog** ("Desactivar a [nombre]? El cliente no aparecerá en cotizaciones ni trabajos nuevos, pero su historial se preserva.") → confirm → `isActive = false`
- Inactive client → click → no dialog → `isActive = true` directly (reversible, non-destructive)

**Row click:** removed. The eye icon is now the entry point for details.

### 2. Backend (API + Service)

**New file:** `src/app/api/clients/[id]/route.ts` with three handlers:

- `GET` — returns one client with `createdBy: { select: { name: true } }` and the **last 10 quotations** and **last 10 payments** related to the client (each with `id`, `number`, `status`, `total` for quotations; `id`, `number`, `amount`, `status`, `dueDate` for payments).
- `PATCH` — updates any subset of client fields. Validates session.
- `DELETE` — **not implemented** (intentionally omitted from the route file).

All handlers validate `session?.user` and return 401 if missing. Errors return 500 with the error message.

**Service changes** (`clientService.ts`):
- `getClients()` — keeps the existing filter `where: { deletedAt: null }` (no change to default behavior). The table page at `/clients` needs to show both active and inactive clients so users can reactivate from the table. **The active-only filtering happens at the modal level** (see below), not at the service level.
- `getClientById(id)` — add the `include` for `createdBy` and the last 10 quotations + payments. Keep `deletedAt: null` filter.
- `createClient`, `updateClient` — unchanged.

**API change for active-only filtering** (`src/app/api/clients/route.ts`):
- `GET` reads an optional query param `?activeOnly=true`. When `true`, filters by `isActive: true`. Default (no param) returns all non-deleted clients.
- The `ClientModal` in the `quotations` and `work-orders` modules is updated to call `GET /api/clients?activeOnly=true`. This ensures inactive clients are not selectable in new quotations/work-orders.
- The `/clients` page calls `GET /api/clients` (no param) and gets all clients — the table shows both.

### 3. Frontend (componentes)

**New files:**
- `src/modules/clients/components/ClientDetailModal.tsx` — read-only modal. Fetches one client via `GET /api/clients/[id]`. Two-column layout:
  - Left: code, name, contact, email, phone, address, city, giro, OC
  - Right: notes (full-width), last payment date, current balance, isActive badge, createdAt, updatedAt, "Creado por: {user}"
  - Bottom: two sections titled "Últimas cotizaciones" and "Últimas facturas". Each is a simple list showing the most recent 10 records (number/code, status badge, amount, due date or creation date). Each row links to the full record. Empty state when there's nothing to show ("Sin cotizaciones aún" / "Sin facturas registradas").

**Note:** the original spec mentioned "Últimos pagos" but the data model has no direct client→payment relation. `Payment` in this codebase is for supplier-side payments (FA, BO, PA, OT, CH — tax documents with `supplierId`). The client-side payment tracking lives on the `Invoice` (via `paidAt`). The modal therefore shows recent **invoices** instead, which is the closest concept to "pagos del cliente" given the schema.

- `src/components/ui/confirm-dialog.tsx` — generic confirm dialog. Props: `open`, `onOpenChange`, `title`, `description`, `confirmLabel`, `cancelLabel`, `variant` ('default' | 'destructive'), `onConfirm`. Reusable for future flows.

**Modified files:**
- `src/modules/clients/components/ClientTable.tsx`:
  - Add new "Acciones" column with the 3 icons
  - Remove `onRowClick` from `DataTable` call
  - Local state: `viewModalOpen`, `editModalOpen`, `confirmDialogOpen`, `selectedClient`
  - `handleEdit` opens `ClientForm` with `defaultValues={selectedClient}` and `editMode={true}`
  - `handleToggleActive` opens `ConfirmDialog` (only when deactivating) or calls PATCH directly (when activating)
  - `handleView` opens `ClientDetailModal` with `selectedClient.id`
  - Re-fetch data after successful PATCH (via `router.refresh()`)

- `src/modules/clients/components/ClientForm.tsx`:
  - In edit mode, set dialog title to "Editar Cliente" and submit button to "Guardar Cambios"
  - When `defaultValues` is present, use it for the form's initial values
  - On submit in edit mode, PATCH to `/api/clients/[id]`; in create mode, POST to `/api/clients`
  - Reuse the existing Zod schema and form structure

- `src/modules/clients/types/client.ts`:
  - Add `createdBy?: { name: string }` to the `Client` type (already in Prisma's inferred type, but the local type may not have it)
  - Add `recentQuotations?` and `recentPayments?` types for the detail view response

### 4. Error handling

- **PATCH fails** (e.g., 500) → show a toast with the error message, the modal stays open, the client is not reloaded
- **GET /api/clients/[id] fails** → show toast "No se pudo cargar el cliente" and close the modal
- **401 from any endpoint** → show toast "Sesión expirada, volvé a iniciar sesión" and refresh the page (or redirect to /login)
- **Network error** → same as 500, generic toast
- **Optimistic UI:** not used. The toggle waits for the server response before updating the badge.

### 5. Verification (manual)

Since there are no automated tests in the clients module, manual verification is required:

1. Create a new client → row appears in the table
2. Click the eye icon → modal opens with all client fields
3. From the detail modal, scroll to "Últimas cotizaciones" and "Últimos pagos" → lists are populated (or empty state shown)
4. Click the pencil icon → form opens pre-filled
5. Edit a field (e.g., name) → click "Guardar Cambios" → modal closes, table refreshes, new value is shown
6. Click the power icon on an active client → ConfirmDialog appears → cancel → nothing changes
7. Click the power icon on an active client → ConfirmDialog appears → confirm → badge changes to "Inactivo", icon color changes to green
8. Click the power icon on an inactive client → no dialog → badge changes to "Activo", icon color changes to red
9. Deactivate a client → open the quotations page and try to create a new one → the deactivated client should NOT appear in the ClientModal picker
10. Reactivate the client → it reappears in the picker

## Out of scope (deferred)

- Hard delete (the `deleteClient` service function stays unused)
- `/clients/[id]` page with full history (the eye replaces the need for a dedicated page for now)
- Bulk actions (deactivate/activate multiple clients at once)
- Role-based permissions (any authenticated user can perform these actions)
- Filtering the table by status (showing only active, only inactive, or both)

## Open questions

None — all design decisions are resolved.
