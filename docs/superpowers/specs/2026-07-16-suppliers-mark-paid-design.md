# Mark Suppliers Documents as Paid — Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-row and bulk "mark as paid" actions to `/suppliers/reports` so the admin can record supplier payments directly from the report (replacing the current manual workflow).

**Architecture:** Single bulk PATCH endpoint that flips `estado` to `PAGADO` for a list of document ids. `ReportsView` (client) owns selection state + bulk button. `ByDueDateTab` and `BySupplierTab` receive `selectedIds`/`onToggleSelect` props and render a new first checkbox column. `DailySummaryTab` hides the bulk action entirely. Zero schema migration.

**Tech Stack:** Next.js 15 App Router, NextAuth v5, Prisma 7, Zod, shadcn-style UI on @base-ui/react (existing), Sonner toasts.

---

## Context

Today, `/suppliers/reports` lists supplier documents to pay (3 tabs: por fecha, por proveedor, resumen por día). The reports only render documents with `estado = "PENDIENTE"` (`src/modules/suppliers-reports/services/supplierReportService.ts` L40, L66). The admin tracks which documents have been paid outside the system and would like the system itself to record that fact so the report row drops out automatically.

**Confirmed current state** (from project exploration, 2026-07-15):
- `SupplierDocument` model has only `estado` (enum `PAGADO | PENDIENTE | CANCELADO`). No `paidAt`, `paidBy`, no payment metadata.
- No existing PATCH endpoint for `SupplierDocument.estado`. The only mutation route is `DELETE /api/suppliers/[id]/documents/[docId]`.
- `/suppliers/reports` is admin-only (Supervisor is blocked by middleware from `/suppliers` prefix).
- `ReportsView` (`src/modules/suppliers-reports/components/ReportsView.tsx`) is a `"use client"` component that owns `rows` state and refetches from `/api/suppliers/reports?type=...` on tab/filter change.
- Tab components (`ByDueDateTab`, `BySupplierTab`, `DailySummaryTab` in `src/modules/suppliers-reports/components/tabs/`) each render their own `<DataTable>` inline using `@tanstack/react-table`. BySupplierTab uses a `DisplayRow` union where `kind: "header"` rows are decorative group headers, NOT real documents.
- `src/components/ui/` has Button, Dialog, Tabs, Sonner (toasts), Tooltip, Table primitives. NO Checkbox primitive exists — needs to be created.

## Design Decisions (user-confirmed 2026-07-15)

| Decision | Choice | Rationale |
|---|---|---|
| What state to record | Only toggle `estado: PENDIENTE → PAGADO` | User picked simplest; no audit fields needed. YAGNI — easy to add `paidAt`/`paidBy` later if requested. |
| Bulk action UI | Checkbox per row + top button "Marcar X como pagados" | User wanted per-row control AND bulk; checkbox + select-all satisfies both. |
| Confirmation / undo | **No** confirmation dialog, **no** undo | User chose fastest path. Mistakes fixed manually via existing `/suppliers/[id]` form modal. |

## Architecture

**Single bulk endpoint** (not per-doc) to avoid N round-trips when the user selects many documents. **Idempotent updateMany** so a re-click on already-paid ids is a no-op, not an error.

```
┌──────────────────────────────────┐
│ /suppliers/reports               │
│  ┌────────────────────────────┐  │
│  │ ReportsView (client)       │  │  owns selectedIds: Set<string>
│  │ - selectedIds              │◄─┼── checkbox onChange per row
│  │ - bulk button (disabled if │  │
│  │   selectedIds.size === 0)  │──┼──► PATCH /api/suppliers/documents/paid
│  └────────────────────────────┘  │     body: { ids: string[] }
└──────────────────────────────────┘
                                       │
                                       ▼
┌────────────────────────────────────────────────────┐
│ route.ts (PATCH)                                  │
│  auth() → 401 if no session                        │
│  markPaidSchema.safeParse(body) → 400 if invalid   │
│  supplierDocumentService.markDocumentsAsPaid(ids)  │
│  → 200 { updated: number }                        │
└────────────────────────────────────────────────────┘
```

## File Structure

### New files

| File | Purpose |
|---|---|
| `src/components/ui/checkbox.tsx` | Minimal `@base-ui/react`-style Checkbox primitive with `checked`, `onCheckedChange`, `disabled` props. Uses `<input type="checkbox">` underneath with theme-aware styles. |
| `src/app/api/suppliers/documents/paid/route.ts` | `PATCH` handler for bulk mark-paid. Auth, validates body, calls service, returns `{ updated }`. |
| `src/modules/suppliers/validations/markPaidSchema.ts` | Zod schema: `z.object({ ids: z.array(z.string().uuid()).min(1).max(500) })`. |
| `src/modules/suppliers-reports/components/SelectionCheckboxHeader.tsx` | Small client component that renders the column-header checkbox (toggles all currently-visible data rows). |

### Modified files

| File | Change |
|---|---|
| `src/modules/suppliers/services/supplierDocumentService.ts` | Add `markDocumentsAsPaid(ids: string[]): Promise<{ updated: number }>` — wraps `prisma.supplierDocument.updateMany({ where: { id: { in: ids }, estado: "PENDIENTE" }, data: { estado: "PAGADO" } })`. |
| `src/modules/suppliers-reports/components/ReportsView.tsx` | Add `selectedIds` state + `toggleSelect`/`clearSelection`/`selectAll` callbacks. Add bulk button next to "Exportar PDF" (hidden when `activeTab === "daily-summary"`). After bulk success: refetch + clearSelection + toast. |
| `src/modules/suppliers-reports/components/tabs/ByDueDateTab.tsx` | Accept `selectedIds: Set<string>` and `onToggleSelect: (id: string) => void` props. Render first column with `<Checkbox checked={selectedIds.has(row.id)} onCheckedChange={() => onToggleSelect(row.id)} />`. |
| `src/modules/suppliers-reports/components/tabs/BySupplierTab.tsx` | Same as above, BUT in column render: if `row.kind === "header"` return an empty `<div>` (no checkbox). Only `kind: "data"` rows get the checkbox. |

## API Contract

### `PATCH /api/suppliers/documents/paid`

**Request body** (`Content-Type: application/json`):
```ts
{
  ids: string[]  // UUIDs of SupplierDocument.id, length 1..500
}
```

**Response codes:**

| Status | Body | When |
|---|---|---|
| `200` | `{ updated: number }` | Success — number of docs flipped from PENDIENTE to PAGADO (may be 0 if all ids were already paid, by design) |
| `400` | `{ error: string }` | Zod validation failed (empty array, > 500, non-uuid, malformed JSON) |
| `401` | `{ error: "Unauthorized" }` | No session — same shape as the existing DELETE route |
| `500` | `{ error: "Internal server error" }` | Prisma/network failure |

**Auth model:** Same as `DELETE /api/suppliers/[id]/documents/[docId]/route.ts` — admin-only via the existing `/suppliers` middleware redirect for non-admins (Supervisor blocked; Manager/Accounting/Sales have `suppliers:read` but the PATCH must additionally require write — check `permissions.ts` or fall back to `session.user.role === "admin"` since reports are admin-only by module-level convention).

**Idempotency guarantee:** the Prisma `where` includes `estado: "PENDIENTE"`, so re-calling with already-paid ids returns `updated: 0` (not an error).

## Validation Schema

```ts
// src/modules/suppliers/validations/markPaidSchema.ts
import { z } from "zod";

export const markPaidSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
});

export type MarkPaidInput = z.infer<typeof markPaidSchema>;
```

- **Min 1**: empty array = no-op, refuse to spend a roundtrip.
- **Max 500**: prevent abusive requests. Realistic upper bound — the user said "marcar todos" but practically they'll mark dozens, not thousands at once.
- **UUID**: matches `SupplierDocument.id` type; catches typos in dev / rejects non-UUID early so Prisma doesn't throw a deeper P2010/P2025.

## Service Contract

```ts
// src/modules/suppliers/services/supplierDocumentService.ts
import { prisma } from "@/lib/prisma/prisma";

export async function markDocumentsAsPaid(
  ids: string[]
): Promise<{ updated: number }> {
  if (ids.length === 0) return { updated: 0 };
  const result = await prisma.supplierDocument.updateMany({
    where: { id: { in: ids }, estado: "PENDIENTE" },
    data: { estado: "PAGADO" },
  });
  return { updated: result.count };
}
```

No transaction needed (single statement). No audit fields. Returns `{ updated: number }` — UI may compare against `ids.length` to show "X de Y ya estaban pagados" if the numbers differ.

## UI State Machine (ReportsView)

```ts
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [bulkMarking, setBulkMarking] = useState(false);

const toggleSelect = useCallback((id: string) => {
  setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
}, []);

const selectAllVisible = useCallback((ids: string[]) => {
  setSelectedIds(prev => {
    const allSelected = ids.every(id => prev.has(id));
    if (allSelected) return new Set(); // uncheck all if every visible already selected
    return new Set([...prev, ...ids]);
  });
}, []);

const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

// Reset on tab change:
useEffect(() => { setSelectedIds(new Set()); }, [activeTab]);
```

**Bulk button visibility:**
```tsx
{activeTab !== "daily-summary" && (
  <Button
    variant="default"
    disabled={selectedIds.size === 0 || bulkMarking}
    onClick={handleBulkMarkPaid}
  >
    {bulkMarking ? "Marcando..." : `Marcar ${selectedIds.size} como pagados`}
  </Button>
)}
```

**handleBulkMarkPaid** flow:
1. `setBulkMarking(true)`
2. `const res = await fetch("/api/suppliers/documents/paid", { method: "PATCH", body: JSON.stringify({ ids: [...selectedIds] }) })`
3. If `res.ok`: toast `${updated} documentos marcados como pagados`, `clearSelection()`, re-call tab's fetch handler to remove the now-paid rows.
4. Else: toast `No se pudo marcar — reintentá`. Do **NOT** clear selection (so the user can retry with one click).

## UI Behavior Per Tab

### `ByDueDateTab` & `BySupplierTab` (per-doc data)

- **Column header** (first column): `<Checkbox checked={allVisibleSelected} onCheckedChange={() => selectAllVisible(visibleDataIds)} />`. "Select all" applies only to currently visible (after filter) data rows.
- **Cell** (first column): if `row.kind === "header"` (BySupplier only) render empty `<div>` — no checkbox, no interactive element. Otherwise `<Checkbox checked={selectedIds.has(row.id)} onCheckedChange={() => onToggleSelect(row.id)} aria-label="Seleccionar documento" />`.

### `DailySummaryTab` (aggregated, no per-doc rows)

- **NO** checkbox column rendered.
- **NO** "Seleccionar todo" header.
- Bulk button **hidden** entirely (vs. disabled). Cleaner — the user is in a different mental model on the summary tab.

## Error Handling & Feedback

| Scenario | UI response |
|---|---|
| Bulk success (200) | Toast verde: `"${updated} documento(s) marcados como pagados"`. Auto-dismiss 3s. Selection cleared. Rows refetched (they vanish because the services filter PENDIENTE). |
| Bulk 500 (Prisma fail) | Toast rojo: `"No se pudo marcar — reintentá"`. Selection **kept** so user can retry. |
| Bulk 400 (validation) | Toast amarillo: message from Zod first issue. Selection kept. (Shouldn't normally trigger because button is disabled when size === 0.) |
| Network fetch throws | Catch in handler, toast rojo, selection kept. |
| Optimistic update? | **No.** Refetch after success is fast enough on localhost (<200ms typical). Optimistic update adds risk for marginal UX gain. |

## Testing Plan

### Vitest unit tests

`tests/suppliers/markDocumentsAsPaid.test.ts`:
- `markDocumentsAsPaid([])` → returns `{ updated: 0 }` (early return, no Prisma call)
- `markDocumentsAsPaid([...paid ids])` → `where.estado: "PENDIENTE"` filter excludes them → returns `{ updated: 0 }`
- `markDocumentsAsPaid([...mixed paid + pending])` → only pending rows updated, count matches expected

`tests/suppliers/markPaidSchema.test.ts`:
- Empty array rejected (message includes "al menos 1")
- 501-id array rejected
- Non-uuid string rejected
- Valid uuid array accepted

### Playwright E2E (`tests/e2e/suppliers-reports-mark-paid.spec.ts`)

1. Login as admin, navigate `/suppliers/reports`, tab "Por Fecha Vencimiento".
2. Verify no docs visible → bulk button not rendered (suppressed because size=0; or rendered disabled).
3. Adjust filters to get at least 2 docs back.
4. Verify checkbox column appears, header checkbox unchecked.
5. Click 2 row checkboxes → bulk button shows "Marcar 2 como pagados", enabled.
6. Click header checkbox → all 3+ visible rows selected.
7. Click header again → all deselected.
8. Re-select 2 rows → click bulk → toast appears → rows disappear from list.
9. Tab "Por Proveedor" → header rows have no checkboxes (only data rows do).
10. Tab "Resumen por Día" → bulk button hidden (DOM check: `getByRole("button", { name: /Marcar/ })` → not found).

## Out of Scope (YAGNI)

- Audit fields: `paidAt`, `paidById`, `paymentMethod`, `paymentReference`. Add later if needed.
- Undo / "Deshacer" toast.
- Confirmation dialog.
- Per-row "mark as paid" via action menu (we have bulk only; per-row is achieved by selecting 1 row and clicking bulk — same UX).
- Keyboard shortcuts (space-to-toggle-selected-row).
- Batch size >500. If a user really has 500+ unpaid docs, they should export PDF first to confirm scope, then split.
- Changes to `/suppliers/[id]` detail view (admin can already change estado via the existing form modal there). This spec only adds the new entry point from reports.

## Commits / Roll-out

Plan to ship as 5 conventional commits (no `Co-Authored-By` or AI attribution):

1. `feat(suppliers): add markDocumentsAsPaid service + markPaidSchema validation`
2. `feat(suppliers): add PATCH /api/suppliers/documents/paid endpoint`
3. `feat(ui): add Checkbox primitive to src/components/ui/`
4. `feat(suppliers-reports): add checkbox column + bulk mark-paid in ReportsView`
5. `test(suppliers-reports): add unit + Playwright tests for mark-paid`

Push to `main`.

## Verification (final acceptance)

- [ ] All 5 commits pushed
- [ ] Vitest suite passes (existing + new)
- [ ] Playwright suite passes
- [ ] Manual smoke: login → /suppliers/reports → select all visible → bulk → rows disappear
- [ ] Manual smoke: /suppliers/reports → tab Resumen por Día → confirm bulk button is NOT in DOM
- [ ] Re-run `scripts/smoke-suppliers-reports-pdf.ts` (existing) to confirm PDF endpoint unaffected
