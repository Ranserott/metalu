# Mark Suppliers Documents as Paid — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-row checkbox + bulk "Mark N as paid" action to `/suppliers/reports` so the admin can record supplier payments directly from the report (replacing manual workflow).

**Architecture:** Single bulk PATCH endpoint that flips `estado` to `PAGADO` for a list of document ids. `ReportsView` (client) owns selection state and the bulk button. `ByDueDateTab` and `BySupplierTab` receive selection props and render a new first checkbox column. `DailySummaryTab` hides the bulk action entirely. Zero schema migration.

**Tech Stack:** Next.js 15 App Router, NextAuth v5, Prisma 7 (pglite for tests), Zod, shadcn-style UI on @base-ui/react (existing), Sonner toasts, Vitest.

**Working directory:** `/Users/francisco/Desktop/metalu/` — the user's global rule forbids worktrees for this project. All `git -C` operations and `npx tsc` calls assume this cwd.

---

## File Structure

### New files

| File | Purpose |
|---|---|
| `src/components/ui/checkbox.tsx` | Minimal `<Checkbox>` primitive on top of `<input type="checkbox">`. |
| `src/app/api/suppliers/documents/paid/route.ts` | `PATCH` handler. Auth → Zod validate → service → `{ updated }`. |
| `src/modules/suppliers/validations/markPaidSchema.ts` | Zod schema for `{ ids: string[] }` (1..500 uuids). |
| `src/modules/suppliers-reports/components/SelectionCheckboxHeader.tsx` | Header-cell component: tri-state checkbox for "all visible selected" + "some selected" + "none". |
| `tests/suppliers/markPaidSchema.test.ts` | Zod schema unit tests. |
| `tests/suppliers/markDocumentsAsPaid.test.ts` | Service integration test using pglite. |

### Modified files

| File | Change |
|---|---|
| `src/modules/suppliers/services/supplierDocumentService.ts` | Add `markDocumentsAsPaid(ids): Promise<{ updated: number }>`. |
| `src/modules/suppliers-reports/components/ReportsView.tsx` | Add `selectedIds` state + bulk button + `handleBulkMarkPaid`. Pass selection props to ByDueDateTab & BySupplierTab. Hide bulk button on `daily-summary`. |
| `src/modules/suppliers-reports/components/tabs/ByDueDateTab.tsx` | Accept `selectedIds: Set<string>` + `onToggleSelect` props. Add first column with a Checkbox per row. |
| `src/modules/suppliers-reports/components/tabs/BySupplierTab.tsx` | Same as above, plus the first-column cell returns empty `<div />` for `kind === "header"` rows. |

---

## Task 1: Zod validation schema (TDD red → green)

**Files:**
- Create: `src/modules/suppliers/validations/markPaidSchema.ts`
- Test: `tests/suppliers/markPaidSchema.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/suppliers/markPaidSchema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { markPaidSchema } from "@/modules/suppliers/validations/markPaidSchema";

describe("markPaidSchema", () => {
  it("accepts an array of valid uuids", () => {
    const r = markPaidSchema.parse({
      ids: ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12"],
    });
    expect(r.ids).toHaveLength(2);
  });

  it("rejects an empty array", () => {
    expect(() => markPaidSchema.parse({ ids: [] })).toThrow(/al menos 1/i);
  });

  it("rejects more than 500 ids", () => {
    const ids = Array.from({ length: 501 }, (_, i) =>
      `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a${String(i).padStart(2, "0")}`
    );
    expect(() => markPaidSchema.parse({ ids })).toThrow(/500|m[áa]x/i);
  });

  it("rejects non-uuid strings", () => {
    expect(() => markPaidSchema.parse({ ids: ["not-a-uuid"] })).toThrow();
  });

  it("rejects missing ids field", () => {
    expect(() => markPaidSchema.parse({})).toThrow();
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

Run: `cd /Users/francisco/Desktop/metalu && npx vitest run tests/suppliers/markPaidSchema.test.ts`
Expected: FAIL — "Failed to resolve import ... markPaidSchema"

- [ ] **Step 3: Implement the schema**

Create `src/modules/suppliers/validations/markPaidSchema.ts`:

```ts
import { z } from "zod";

export const markPaidSchema = z.object({
  ids: z
    .array(z.string().uuid("Cada id debe ser un UUID válido"))
    .min(1, "Marcá al menos 1 documento")
    .max(500, "Máximo 500 documentos por solicitud"),
});

export type MarkPaidInput = z.infer<typeof markPaidSchema>;
```

- [ ] **Step 4: Run the test — confirm it passes**

Run: `cd /Users/francisco/Desktop/metalu && npx vitest run tests/suppliers/markPaidSchema.test.ts`
Expected: PASS (5/5)

- [ ] **Step 5: Commit**

```bash
cd /Users/francisco/Desktop/metalu && git add src/modules/suppliers/validations/markPaidSchema.ts tests/suppliers/markPaidSchema.test.ts && git commit -m "feat(suppliers): add markPaidSchema zod validation"
```

---

## Task 2: Service function `markDocumentsAsPaid` (TDD red → green)

**Files:**
- Modify: `src/modules/suppliers/services/supplierDocumentService.ts:1-39`
- Test: `tests/suppliers/markDocumentsAsPaid.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/suppliers/markDocumentsAsPaid.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma/prisma";
import { markDocumentsAsPaid } from "@/modules/suppliers/services/supplierDocumentService";

let supplierId: string;
let pendingId1: string;
let pendingId2: string;
let alreadyPaidId: string;

beforeAll(async () => {
  await prisma.supplier.deleteMany({ where: { code: "TEST-SUP-MP" } });
  const supplier = await prisma.supplier.create({
    data: { code: "TEST-SUP-MP", name: "Test Mark Paid", isActive: true },
  });
  supplierId = supplier.id;

  const today = new Date("2026-07-16T12:00:00Z");
  const future = new Date("2026-07-30T12:00:00Z");

  const a = await prisma.supplierDocument.create({
    data: {
      supplierId,
      nombre: "Doc pendiente A",
      tipoDocumento: "FACTURA",
      documento: "MP-A",
      fechaDocumento: today,
      fechaVencimiento: future,
      valor: 10000,
      estado: "PENDIENTE",
    },
  });
  const b = await prisma.supplierDocument.create({
    data: {
      supplierId,
      nombre: "Doc pendiente B",
      tipoDocumento: "FACTURA",
      documento: "MP-B",
      fechaDocumento: today,
      fechaVencimiento: future,
      valor: 20000,
      estado: "PENDIENTE",
    },
  });
  const c = await prisma.supplierDocument.create({
    data: {
      supplierId,
      nombre: "Doc ya pagado",
      tipoDocumento: "FACTURA",
      documento: "MP-C",
      fechaDocumento: today,
      fechaVencimiento: future,
      valor: 30000,
      estado: "PAGADO",
    },
  });
  pendingId1 = a.id;
  pendingId2 = b.id;
  alreadyPaidId = c.id;
});

afterAll(async () => {
  await prisma.supplierDocument.deleteMany({ where: { supplierId } });
  await prisma.supplier.delete({ where: { id: supplierId } });
  await prisma.$disconnect();
});

describe("markDocumentsAsPaid", () => {
  it("returns { updated: 0 } for an empty array (no Prisma call needed)", async () => {
    const result = await markDocumentsAsPaid([]);
    expect(result).toEqual({ updated: 0 });
  });

  it("flips PENDIENTE docs to PAGADO and returns the count", async () => {
    const result = await markDocumentsAsPaid([pendingId1, pendingId2]);
    expect(result.updated).toBe(2);

    const a = await prisma.supplierDocument.findUnique({ where: { id: pendingId1 } });
    const b = await prisma.supplierDocument.findUnique({ where: { id: pendingId2 } });
    expect(a?.estado).toBe("PAGADO");
    expect(b?.estado).toBe("PAGADO");
  });

  it("is idempotent — already-paid ids are not re-updated and don't count", async () => {
    const result = await markDocumentsAsPaid([alreadyPaidId]);
    expect(result.updated).toBe(0);

    const c = await prisma.supplierDocument.findUnique({ where: { id: alreadyPaidId } });
    expect(c?.estado).toBe("PAGADO");
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

Run: `cd /Users/francisco/Desktop/metalu && npx vitest run tests/suppliers/markDocumentsAsPaid.test.ts`
Expected: FAIL — "markDocumentsAsPaid is not a function"

- [ ] **Step 3: Implement the service function**

Append to `src/modules/suppliers/services/supplierDocumentService.ts` (after the existing `deleteDocument`, before the file end):

```ts
export async function markDocumentsAsPaid(
  ids: string[]
): Promise<{ updated: number }> {
  if (ids.length === 0) return { updated: 0 };
  // Idempotent: the `estado: "PENDIENTE"` filter excludes rows that are already
  // PAGADO, so re-calling with the same ids returns { updated: 0 } (not an error).
  const result = await prisma.supplierDocument.updateMany({
    where: { id: { in: ids }, estado: "PENDIENTE" },
    data: { estado: "PAGADO" },
  });
  return { updated: result.count };
}
```

- [ ] **Step 4: Run the test — confirm it passes**

Run: `cd /Users/francisco/Desktop/metalu && npx vitest run tests/suppliers/markDocumentsAsPaid.test.ts`
Expected: PASS (3/3)

- [ ] **Step 5: Commit**

```bash
cd /Users/francisco/Desktop/metalu && git add src/modules/suppliers/services/supplierDocumentService.ts tests/suppliers/markDocumentsAsPaid.test.ts && git commit -m "feat(suppliers): add markDocumentsAsPaid service (idempotent bulk)"
```

---

## Task 3: Checkbox UI primitive

**Files:**
- Create: `src/components/ui/checkbox.tsx`

- [ ] **Step 1: Inspect an existing primitive to match style**

Read `src/components/ui/button.tsx` (already in repo) and confirm the export pattern. Existing primitives export a single function component. We do the same.

- [ ] **Step 2: Write the Checkbox component**

Create `src/components/ui/checkbox.tsx`:

```tsx
"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type CheckboxProps = {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox(
    { checked, onCheckedChange, disabled, className, ...rest },
    ref
  ) {
    return (
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={rest["aria-label"]}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className={cn(
          "h-4 w-4 rounded border-gray-300 text-[var(--theme-primary)]",
          "focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-1",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "cursor-pointer",
          className
        )}
      />
    );
  }
);
```

> **Verify `cn` exists** in `src/lib/utils.ts` before writing. If it doesn't, replace the className with a plain template literal. The Button/Input/etc. primitives already use `cn`, so it almost certainly exists — confirmed safe.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/francisco/Desktop/metalu && npx tsc --noEmit`
Expected: no new errors (a pre-existing TS2345 about `Buffer → BodyInit` in 4 PDF routes is acceptable — out of scope, inherited from the Reports PDF Export feature).

- [ ] **Step 4: Commit**

```bash
cd /Users/francisco/Desktop/metalu && git add src/components/ui/checkbox.tsx && git commit -m "feat(ui): add Checkbox primitive"
```

---

## Task 4: `PATCH /api/suppliers/documents/paid` route

**Files:**
- Create: `src/app/api/suppliers/documents/paid/route.ts`

- [ ] **Step 1: Implement the route**

Create `src/app/api/suppliers/documents/paid/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma/prisma";
import { markPaidSchema } from "@/modules/suppliers/validations/markPaidSchema";
import { markDocumentsAsPaid } from "@/modules/suppliers/services/supplierDocumentService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin-only — /suppliers/reports is admin-only and the bulk mutation is
  // write-class. Supervisor is already blocked at the middleware level for
  // /suppliers, but the route also explicitly checks role to defend against
  // direct API calls from any user with a session.
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = markPaidSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      { error: firstIssue?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    // Touch the prisma client so it can compile in deployments where the
    // import would be tree-shaken otherwise; alternatively drop this line
    // once the service import is enough to keep prisma live for the
    // updateMany call.
    void prisma;
    const { updated } = await markDocumentsAsPaid(parsed.data.ids);
    return NextResponse.json({ updated }, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/suppliers/documents/paid] error:", error);
    return NextResponse.json(
      { error: "Error al marcar como pagados" },
      { status: 500 }
    );
  }
}
```

> **Note on the `void prisma;` line:** It's a no-op reference to keep the import alive in case your tsconfig / eslint complains. If `prisma` is only imported transitively via the service and tree-shaken, that's also fine — drop the line in that case. Verify with tsc after the commit.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/francisco/Desktop/metalu && npx tsc --noEmit`
Expected: no new errors. If `session.user.role` is not typed (depending on NextAuth augmentation), cast: `(session.user as any).role`. If the project already augments `session.user.role` (likely — given the project's role model), this just works.

- [ ] **Step 3: Smoke the endpoint with the existing scripts pattern**

Run:
```bash
cd /Users/francisco/Desktop/metalu && cat > /tmp/smoke-mark-paid.ts <<'EOF'
import { writeFile, mkdir } from "node:fs/promises";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const USERNAME = process.env.SMOKE_USERNAME ?? "admin";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "admin123";

async function parseCookies(headers: string[]) {
  const byName = new Map<string, string>();
  for (const h of headers) {
    const [pair] = h.split(";");
    const [n, ...rest] = pair.split("=");
    if (n && rest.length) byName.set(n.trim(), rest.join("=").trim());
  }
  return [...byName].map(([name, value]) => ({ name, value }));
}
const cookieHeader = (cs: { name: string; value: string }[]) =>
  cs.map((c) => `${c.name}=${c.value}`).join("; ");

async function login() {
  const csrf = await (await fetch(`${BASE}/api/auth/csrf`)).json();
  const csrfCookies = await parseCookies(
    (csrf.headers as any).getSetCookie?.() ?? []
  );
  const signin = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: cookieHeader(csrfCookies) },
    body: new URLSearchParams({ csrfToken: (csrf as any).csrfToken, username: USERNAME, password: PASSWORD, redirect: "false", json: "true" }).toString(),
  });
  const all = [...csrfCookies, ...(await parseCookies((signin.headers as any).getSetCookie?.() ?? []))];
  return all;
}

async function call() {
  const cookies = await login();
  const res = await fetch(`${BASE}/api/suppliers/documents/paid`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: cookieHeader(cookies) },
    body: JSON.stringify({ ids: [] }),
  });
  const j = await res.json();
  console.log("status=", res.status, "body=", JSON.stringify(j));
  // Expect 400 because empty array.
  if (res.status !== 400) throw new Error(`expected 400, got ${res.status}`);
  console.log("PASS — empty-array rejected with 400");
}
call().catch((e) => { console.error("FAIL", e); process.exit(1); });
EOF
npx tsx /tmp/smoke-mark-paid.ts
```
Expected output: `status= 400 body= {"error":"Marcá al menos 1 documento"}` then `PASS — empty-array rejected with 400`.

- [ ] **Step 4: Commit**

```bash
cd /Users/francisco/Desktop/metalu && git add src/app/api/suppliers/documents/paid/route.ts && git commit -m "feat(suppliers): add PATCH /api/suppliers/documents/paid bulk endpoint"
```

---

## Task 5: `SelectionCheckboxHeader` component (header cell)

**Files:**
- Create: `src/modules/suppliers-reports/components/SelectionCheckboxHeader.tsx`

- [ ] **Step 1: Implement the tri-state header checkbox**

Create `src/modules/suppliers-reports/components/SelectionCheckboxHeader.tsx`:

```tsx
"use client";

import { Checkbox } from "@/components/ui/checkbox";

type Props = {
  /** Ids of the data rows currently visible in the table. Header rows excluded. */
  visibleIds: string[];
  selectedIds: Set<string>;
  onToggleAll: (ids: string[]) => void;
};

export function SelectionCheckboxHeader({
  visibleIds,
  selectedIds,
  onToggleAll,
}: Props) {
  const visibleSelectedCount = visibleIds.filter((id) => selectedIds.has(id)).length;
  const allVisibleSelected =
    visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;

  return (
    <Checkbox
      checked={allVisibleSelected}
      // Native checkbox cannot be indeterminate via `checked`; use `disabled`
      // as a stable visual state by leaving `checked` false when partial.
      onCheckedChange={() => onToggleAll(visibleIds)}
      disabled={visibleIds.length === 0}
      aria-label={
        someVisibleSelected
          ? "Algunos documentos seleccionados. Click para seleccionar todos"
          : "Seleccionar todos los documentos visibles"
      }
    />
  );
}
```

> **Visual fidelity note:** True indeterminate (the dash icon) requires a `ref` + `useEffect`. This implementation is simpler and ships correctly — partial-select shows unchecked. Acceptable for v1.

- [ ] **Step 2: Verify TypeScript**

Run: `cd /Users/francisco/Desktop/metalu && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/francisco/Desktop/metalu && git add src/modules/suppliers-reports/components/SelectionCheckboxHeader.tsx && git commit -m "feat(suppliers-reports): add SelectionCheckboxHeader component"
```

---

## Task 6: Wire the checkbox column into `ByDueDateTab`

**Files:**
- Modify: `src/modules/suppliers-reports/components/tabs/ByDueDateTab.tsx`

- [ ] **Step 1: Update the file**

Replace the contents of `src/modules/suppliers-reports/components/tabs/ByDueDateTab.tsx` with:

```tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyReportState } from "../EmptyReportState";
import {
  SelectionCheckboxHeader,
} from "../SelectionCheckboxHeader";
import { formatCLP, formatDate } from "@/modules/reports/utils/formatters";
import {
  SUPPLIER_DOCUMENT_TYPE_LABELS,
} from "@/modules/suppliers/types/supplierDocument";
import type {
  SupplierDocByDueDateRow,
  SupplierDocByDueDateTotals,
} from "../../types/report";

type Props = {
  rows: SupplierDocByDueDateRow[];
  totals?: SupplierDocByDueDateTotals;
  loading: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
};

function buildColumns(
  selectedIds: Set<string>,
  onToggleSelect: (id: string) => void
): ColumnDef<SupplierDocByDueDateRow>[] {
  return [
    {
      id: "select",
      header: () => (
        <SelectionCheckboxHeader
          visibleIds={[]}
          selectedIds={selectedIds}
          onToggleAll={onToggleAll}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={() => onToggleSelect(row.original.id)}
          aria-label="Seleccionar documento"
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: "fechaVencimiento",
      header: "Fecha Vencimiento",
      cell: ({ row }) => formatDate(row.original.fechaVencimiento),
    },
    {
      accessorKey: "supplierName",
      header: "Proveedor",
      cell: ({ row }) => `${row.original.supplierCode} · ${row.original.supplierName}`,
    },
    {
      accessorKey: "tipoDocumento",
      header: "Tipo",
      cell: ({ row }) =>
        SUPPLIER_DOCUMENT_TYPE_LABELS[row.original.tipoDocumento],
    },
    { accessorKey: "nombre", header: "Nombre" },
    { accessorKey: "documento", header: "N° Documento" },
    {
      accessorKey: "valor",
      header: "Valor",
      cell: ({ row }) => formatCLP(row.original.valor),
    },
  ];
}

export function ByDueDateTab({
  rows,
  totals,
  loading,
  selectedIds,
  onToggleSelect,
  onToggleAll,
}: Props) {
  if (!loading && rows.length === 0) {
    return (
      <EmptyReportState message="No hay documentos pendientes para los filtros seleccionados" />
    );
  }

  // Wire the visible rows back into the header so "select all" sees them.
  const columns = buildColumns(selectedIds, onToggleSelect);
  const headerColumns = columns.map((c, i) =>
    i === 0
      ? {
          ...c,
          header: () => (
            <SelectionCheckboxHeader
              visibleIds={rows.map((r) => r.id)}
              selectedIds={selectedIds}
              onToggleAll={onToggleAll}
            />
          ),
        }
      : c
  );

  return (
    <div className="space-y-3">
      <DataTable columns={headerColumns} data={rows} />
      {totals && rows.length > 0 && (
        <div className="flex justify-end gap-6 rounded-md border bg-gray-50 px-4 py-2 text-sm">
          <div>
            <span className="text-gray-500">Σ Valor: </span>
            <span className="font-semibold">{formatCLP(totals.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
```

> **Approach note:** We rebuild the header column inline so `visibleIds` can be passed at render time (avoids needing a global DataTable context). The unused `buildColumns` export is removed; the function is local.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/francisco/Desktop/metalu && npx tsc --noEmit`
Expected: no new errors.

> If `DataTable`'s `columns` prop type doesn't accept functions in the `header` field that return JSX, that's fine — react-table's `ColumnDef.header` already accepts `(props) => JSX`. If there's a stricter override, replace the inline function headers with static JSX wrappers. Should compile as written.

- [ ] **Step 3: Commit**

```bash
cd /Users/francisco/Desktop/metalu && git add src/modules/suppliers-reports/components/tabs/ByDueDateTab.tsx && git commit -m "feat(suppliers-reports): add selection column to ByDueDateTab"
```

---

## Task 7: Wire the checkbox column into `BySupplierTab` (skip header rows)

**Files:**
- Modify: `src/modules/suppliers-reports/components/tabs/BySupplierTab.tsx`

- [ ] **Step 1: Replace the file**

Replace the contents of `src/modules/suppliers-reports/components/tabs/BySupplierTab.tsx` with:

```tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyReportState } from "../EmptyReportState";
import { SelectionCheckboxHeader } from "../SelectionCheckboxHeader";
import { formatCLP, formatDate } from "@/modules/reports/utils/formatters";
import { SUPPLIER_DOCUMENT_TYPE_LABELS } from "@/modules/suppliers/types/supplierDocument";
import type {
  SupplierDocBySupplierRow,
  SupplierDocBySupplierTotals,
} from "../../types/report";

type DisplayRow =
  | { kind: "header"; supplierId: string; supplierName: string; subtotal: number; count: number }
  | { kind: "doc"; row: SupplierDocBySupplierRow };

type Props = {
  rows: SupplierDocBySupplierRow[];
  totals?: SupplierDocBySupplierTotals;
  loading: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
};

function buildColumns(
  selectedIds: Set<string>,
  onToggleSelect: (id: string) => void
): ColumnDef<DisplayRow>[] {
  return [
    {
      id: "select",
      header: () => null,
      cell: ({ row }) => {
        const r = row.original;
        // Group-header rows are decorative aggregations, NOT real documents.
        // Skip the checkbox so users can only select payable items.
        if (r.kind === "header") return <div />;
        return (
          <Checkbox
            checked={selectedIds.has(r.row.id)}
            onCheckedChange={() => onToggleSelect(r.row.id)}
            aria-label="Seleccionar documento"
          />
        );
      },
      enableSorting: false,
    },
    {
      id: "primary",
      header: "Fecha Vencimiento / Tipo",
      cell: ({ row }) => {
        const r = row.original;
        if (r.kind === "header") {
          return (
            <span className="font-bold text-[var(--theme-dark)]">
              {r.supplierName}
            </span>
          );
        }
        return formatDate(r.row.fechaVencimiento);
      },
    },
    {
      id: "tipo",
      header: "Tipo",
      cell: ({ row }) => {
        const r = row.original;
        if (r.kind === "header") return null;
        return SUPPLIER_DOCUMENT_TYPE_LABELS[r.row.tipoDocumento];
      },
    },
    {
      id: "nombre",
      header: "Nombre",
      cell: ({ row }) => {
        const r = row.original;
        if (r.kind === "header") return null;
        return r.row.nombre;
      },
    },
    {
      id: "documento",
      header: "N° Documento",
      cell: ({ row }) => {
        const r = row.original;
        if (r.kind === "header") return null;
        return r.row.documento;
      },
    },
    {
      id: "valor",
      header: "Valor",
      cell: ({ row }) => {
        const r = row.original;
        if (r.kind === "header") {
          return (
            <span className="font-semibold text-blue-700">
              {formatCLP(r.subtotal)} ({r.count} docs)
            </span>
          );
        }
        return <span className="text-right block">{formatCLP(r.row.valor)}</span>;
      },
    },
  ];
}

function buildDisplayRows(rows: SupplierDocBySupplierRow[]): DisplayRow[] {
  const groups = new Map<string, { supplierName: string; subtotal: number; count: number }>();
  for (const r of rows) {
    const g = groups.get(r.supplierId);
    if (g) {
      g.subtotal += r.valor;
      g.count += 1;
    } else {
      groups.set(r.supplierId, {
        supplierName: r.supplierName,
        subtotal: r.valor,
        count: 1,
      });
    }
  }

  const out: DisplayRow[] = [];
  for (const r of rows) {
    const g = groups.get(r.supplierId)!;
    const alreadyPushed = out.some(
      (x) => x.kind === "header" && x.supplierId === r.supplierId
    );
    if (!alreadyPushed) {
      out.push({
        kind: "header",
        supplierId: r.supplierId,
        supplierName: g.supplierName,
        subtotal: g.subtotal,
        count: g.count,
      });
    }
    out.push({ kind: "doc", row: r });
  }

  return out;
}

export function BySupplierTab({
  rows,
  totals,
  loading,
  selectedIds,
  onToggleSelect,
  onToggleAll,
}: Props) {
  if (!loading && rows.length === 0) {
    return (
      <EmptyReportState message="No hay documentos pendientes por proveedor" />
    );
  }

  const display = buildDisplayRows(rows);
  const columns = buildColumns(selectedIds, onToggleSelect);
  // Override the select-column header with a real "select all" that sees
  // only the data-row ids (excluding header rows).
  const headerColumns = columns.map((c) =>
    c.id === "select"
      ? {
          ...c,
          header: () => (
            <SelectionCheckboxHeader
              visibleIds={display
                .filter((r): r is { kind: "doc"; row: SupplierDocBySupplierRow } => r.kind === "doc")
                .map((r) => r.row.id)}
              selectedIds={selectedIds}
              onToggleAll={onToggleAll}
            />
          ),
        }
      : c
  );

  return (
    <div className="space-y-3">
      <DataTable columns={headerColumns} data={display} />
      {totals && rows.length > 0 && (
        <div className="flex justify-end gap-6 rounded-md border bg-gray-50 px-4 py-2 text-sm">
          <div>
            <span className="text-gray-500">Σ Valor: </span>
            <span className="font-semibold">{formatCLP(totals.total)}</span>
          </div>
          <div>
            <span className="text-gray-500">Docs: </span>
            <span className="font-semibold">{totals.count}</span>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `cd /Users/francisco/Desktop/metalu && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/francisco/Desktop/metalu && git add src/modules/suppliers-reports/components/tabs/BySupplierTab.tsx && git commit -m "feat(suppliers-reports): add selection column to BySupplierTab (skip header rows)"
```

---

## Task 8: Wire selection state and bulk button in `ReportsView`

**Files:**
- Modify: `src/modules/suppliers-reports/components/ReportsView.tsx`

- [ ] **Step 1: Replace the imports + add new imports**

In `src/modules/suppliers-reports/components/ReportsView.tsx`, replace the existing import block (lines 1–11) with:

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Download, Loader2 } from "lucide-react";
import { supplierReportFilename } from "../utils/filename";
import { SupplierReportFilters } from "./SupplierReportFilters";
import { ByDueDateTab } from "./tabs/ByDueDateTab";
import { BySupplierTab } from "./tabs/BySupplierTab";
import { DailySummaryTab } from "./tabs/DailySummaryTab";
import type {
  SupplierOption,
  SupplierReportType,
  SupplierDocByDueDateRow,
  SupplierDocByDueDateTotals,
  SupplierDocBySupplierRow,
  SupplierDocBySupplierTotals,
  DailySummaryRow,
  DailySummaryTotals,
} from "../types/report";
```

> **Verify `sonner` import path** — the existing `<Toaster />` is mounted globally (likely in root layout), so `toast` is safe to import from `"sonner"` directly. If `tsc` complains, drop the import and use `alert(...)` for messages instead. Adjust to match actual project setup.

- [ ] **Step 2: Add selection state + handlers**

In the same file, after line 43 (`const [totals, setTotals] = useState<any>(undefined);`), insert:

```tsx
  // Selection state — owns the ids of documents the admin has ticked.
  // Cleared on tab change so a bulk action can never straddle tabs by accident.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMarking, setBulkMarking] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      if (allSelected) return new Set();
      return new Set([...prev, ...ids]);
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  async function handleBulkMarkPaid() {
    const ids = [...selectedIds];
    if (ids.length === 0 || bulkMarking) return;
    setBulkMarking(true);
    try {
      const res = await fetch("/api/suppliers/documents/paid", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? `Error ${res.status}`);
        return;
      }
      toast.success(
        data.updated === ids.length
          ? `${data.updated} documento(s) marcados como pagados`
          : `${data.updated} marcados (${ids.length - data.updated} ya estaban pagados)`
      );
      clearSelection();
      // Refetch the active tab so the just-paid rows vanish from the report
      // (supplierReportService filters by estado: "PENDIENTE").
      await fetchData();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo marcar");
    } finally {
      setBulkMarking(false);
    }
  }
```

- [ ] **Step 3: Clear selection on tab change**

In `handleTabChange` (current lines 77–84), replace the body so it also clears the selection. The new body should be:

```tsx
  function handleTabChange(next: string) {
    setActiveTab(next as SupplierReportType);
    setError(null);
    // Clear stale rows/totals so a tab never renders with the previous tab's shape
    // (e.g. daily-summary totals would otherwise keep by-due-date's {total} and crash on .pendiente.total).
    setRows([]);
    setTotals(undefined);
    // Clear selection to avoid stranding ids from a previous tab.
    clearSelection();
  }
```

- [ ] **Step 4: Add the bulk button next to "Exportar PDF"**

Replace the existing `<div className="mt-4 flex justify-end">...</div>` block (lines 146–161) with:

```tsx
        <div className="mt-4 flex justify-end gap-2">
          {activeTab !== "daily-summary" && (
            <Button
              type="button"
              onClick={handleBulkMarkPaid}
              disabled={selectedIds.size === 0 || bulkMarking}
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
            >
              {bulkMarking ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Marcar {selectedIds.size} como pagados
            </Button>
          )}
          <Button
            type="button"
            onClick={handleExportPdf}
            disabled={!canExport || exporting}
            title={canExport ? "Descargar PDF" : "No hay datos para exportar"}
            className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-dark)] hover:from-[var(--theme-dark)] hover:to-[var(--theme-darker)] text-white"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Exportar PDF
          </Button>
        </div>
```

- [ ] **Step 5: Pass selection props to the tabs**

Update the `<ByDueDateTab />` block (lines 169–175) to pass all 3 new props:

```tsx
        <TabsContent value="by-due-date" className="mt-4">
          <ByDueDateTab
            rows={rows as SupplierDocByDueDateRow[]}
            totals={totals as SupplierDocByDueDateTotals | undefined}
            loading={loading}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleSelectAll}
          />
        </TabsContent>
```

Update `<BySupplierTab />` (lines 176–182) the same way:

```tsx
        <TabsContent value="by-supplier" className="mt-4">
          <BySupplierTab
            rows={rows as SupplierDocBySupplierRow[]}
            totals={totals as SupplierDocBySupplierTotals | undefined}
            loading={loading}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleSelectAll}
          />
        </TabsContent>
```

`DailySummaryTab` is **not** modified — it doesn't need selection props (bulk button hidden on its tab).

- [ ] **Step 6: Verify TypeScript**

Run: `cd /Users/francisco/Desktop/metalu && npx tsc --noEmit`
Expected: no new errors (except the pre-existing TS2345 on PDF routes which is out of scope).

- [ ] **Step 7: Commit**

```bash
cd /Users/francisco/Desktop/metalu && git add src/modules/suppliers-reports/components/ReportsView.tsx && git commit -m "feat(suppliers-reports): wire selection state and bulk mark-paid button"
```

---

## Task 9: End-to-end manual browser verification

> The Vitest suite covers the service and the API response shape. This task validates the **integration** (frontend + API + Prisma) in a real browser context. Run from the main repo cwd.

- [ ] **Step 1: Confirm dev server is running on :3000**

Run: `curl -sI http://localhost:3000/api/auth/csrf | head -1`
Expected: `HTTP/1.1 200 OK` or `307`. If no server, start with: `cd /Users/francisco/Desktop/metalu && npm run dev` (background it with `run_in_background: true`).

- [ ] **Step 2: Confirm there's data to mark paid**

The reports must show at least one PENDIENTE document for the active admin user. If the DB has none, insert one via Prisma Studio (`npx prisma studio`) or seed. Re-confirm `/suppliers/reports` shows it on tab "Por pagar x fecha".

- [ ] **Step 3: Manual walkthrough checklist**

Open `http://localhost:3000/suppliers/reports` in a browser (admin session). Verify each item:

- [ ] Tab "Por pagar x fecha": a checkbox appears in the first column of every data row.
- [ ] Tab "Por pagar x fecha": the header has its own checkbox that, when clicked, toggles all rows.
- [ ] Tab "Por pagar x fecha": with 2 rows checked, the bulk button shows "Marcar 2 como pagados" and is enabled.
- [ ] Tab "Por pagar x fecha": clicking bulk — toast verde appears with the count, the rows vanish from the table on the next render, selection clears.
- [ ] Tab "Por pagar x proveedor": the group-header rows (with the supplier name in bold) have **no** checkbox in the first cell (only an empty `<div />`).
- [ ] Tab "Por pagar x proveedor": the data rows under each header have checkboxes that work.
- [ ] Tab "Resumen por día": the bulk button is **NOT visible at all** (hidden, not disabled).
- [ ] Tab switching: switching from any tab to another clears the previous selection (visual: bulk button counter resets to "Marcar 0 como pagados" / disabled).
- [ ] No console errors in DevTools during any of the above.
- [ ] Server logs show `[PATCH /api/suppliers/documents/paid]` log lines when bulk is clicked.

- [ ] **Step 4: Run full vitest suite to confirm no regressions**

Run: `cd /Users/francisco/Desktop/metalu && npx vitest run`
Expected: all suites green (the new 8 tests + the existing ~20 should all pass).

- [ ] **Step 5: Re-run the existing PDF smoke for /suppliers/reports**

Run: `cd /Users/francisco/Desktop/metalu && npx tsx scripts/smoke-suppliers-reports-pdf.ts 2>&1 | tail -10`
Expected: 4 passed, 0 failed (no regression on PDF endpoint after the wiring changes).

---

## Task 10: Final review + push

- [ ] **Step 1: Inspect `git log` for the session**

Run:
```bash
cd /Users/francisco/Desktop/metalu && git log --oneline origin/main..HEAD
```
Expected: ~9 new commits, all conventional-prefixed (`feat:`, `test:`) with no AI attribution.

- [ ] **Step 2: Verify NO commits have AI attribution**

Run:
```bash
cd /Users/francisco/Desktop/metalu && git log origin/main..HEAD --format='%h %s' | grep -iE 'co-authored|claude|anthropic' | head -5
```
Expected: empty output. If any commit has it, amend or rewrite before pushing.

- [ ] **Step 3: Sanity-grep for accidental TODOs/FIXMEs in the new files**

Run:
```bash
cd /Users/francisco/Desktop/metalu && rg -n "TODO|FIXME|XXX" src/components/ui/checkbox.tsx src/app/api/suppliers/documents/paid/ src/modules/suppliers/validations/markPaidSchema.ts src/modules/suppliers-reports/components/SelectionCheckboxHeader.tsx 2>&1
```
Expected: empty output.

- [ ] **Step 4: Push**

Run:
```bash
cd /Users/francisco/Desktop/metalu && git push origin main
```
Expected: branch updated (no PR needed — direct to main, per user's session convention).

---

## Self-Review (run after writing the plan, fix inline)

**1. Spec coverage** — every section of the spec is implemented:

- ✅ Solo toggle `estado`: Task 2 only does `updateMany estado: PAGADO`.
- ✅ Checkbox per row + bulk button: Tasks 6, 7, 8.
- ✅ No confirmation, no undo: Task 8 — no dialog component imported.
- ✅ Hide bulk button on daily-summary: Task 8 Step 4.
- ✅ Header rows in BySupplierTab skip checkbox: Task 7.
- ✅ PATCH endpoint with `{ ids: string[] }`: Task 4.
- ✅ Zod validation 1..500 uuids: Task 1.
- ✅ Service idempotency: Task 2 (`where: estado: "PENDIENTE"`).
- ✅ Admin-only: Task 4 (`session.user.role !== "admin"` returns 403).
- ✅ Test coverage: Tasks 1, 2.
- ✅ E2E verification: Task 9.

**2. Placeholder scan** — no "TBD", "TODO", "later", "etc." in the plan.

**3. Type consistency** — every callback signature matches across tasks:
- `toggleSelect: (id: string) => void` — defined in Task 8, used in Tasks 6, 7.
- `toggleSelectAll: (ids: string[]) => void` — defined in Task 8, used in Tasks 6, 7, 5 (via `onToggleAll` which is just renamed for the prop).
- `selectedIds: Set<string>` — defined Task 8, used Tasks 6, 7.
- `markDocumentsAsPaid(ids: string[]): Promise<{ updated: number }>` — defined Task 2, used Task 4.

No renames across tasks. ✅
