# Supplier Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 3 supplier reports at `/suppliers/reports`: docs-by-due-date (PENDIENTE only, ordered by `fechaVencimiento`), docs-by-supplier (grouped with subtotals), and daily-summary (one row per day with breakdown by estado).

**Architecture:** Mirror the existing `/reports` module — single page with `<Tabs>`, shared `supplierId` + date-range filter state, single API route `/api/suppliers/reports` with `type` discriminator, service with 3 query functions returning `{ rows, totals }`. Reuses `DataTable`, `Badge`, `formatCLP`/`formatDate`, `EmptyReportState`.

**Tech Stack:** Next.js 16 (App Router), React 19, Prisma 7 + `@prisma/adapter-pg`, @base-ui/react, Zod, @tanstack/react-table, Vitest (unit tests), Playwright (smoke test).

---

## File Structure

**New files:**
- `src/app/(dashboard)/suppliers/reports/page.tsx` — Server component, auth + load suppliers for dropdown, renders `<ReportsView>`
- `src/app/api/suppliers/reports/route.ts` — GET endpoint, type discriminator
- `src/modules/suppliers-reports/types/report.ts` — 3 Row types + Totals types
- `src/modules/suppliers-reports/validations/reportSchemas.ts` — Zod enums + filters schema
- `src/modules/suppliers-reports/services/supplierReportService.ts` — 3 query functions + pivot helper
- `src/modules/suppliers-reports/components/ReportsView.tsx` — Tabs + shared filter state + fetch
- `src/modules/suppliers-reports/components/SupplierReportFilters.tsx` — Dropdown proveedor + rango fechas
- `src/modules/suppliers-reports/components/EmptyReportState.tsx` — Empty state (icon + message)
- `src/modules/suppliers-reports/components/tabs/ByDueDateTab.tsx` — Flat table by fechaVencimiento
- `src/modules/suppliers-reports/components/tabs/BySupplierTab.tsx` — Grouped table with subtotal headers
- `src/modules/suppliers-reports/components/tabs/DailySummaryTab.tsx` — Breakdown by estado per day
- `tests/supplier-reports/pivot.test.ts` — Unit test for daily-summary pivot helper
- `tests/supplier-reports/schemas.test.ts` — Unit test for Zod schema

**Modified files:**
- `src/components/Sidebar.tsx` — Add link "Reportes de proveedores" → `/suppliers/reports` (under Proveedores section)

**No modifications to:** Prisma schema, existing reports module, supplier module, types/components outside `/suppliers-reports/`.

---

## Task 1: Types + Zod schemas

**Files:**
- Create: `src/modules/suppliers-reports/types/report.ts`
- Create: `src/modules/suppliers-reports/validations/reportSchemas.ts`
- Create: `tests/supplier-reports/schemas.test.ts`

- [ ] **Step 1: Create types file**

Create `src/modules/suppliers-reports/types/report.ts` with:

```ts
import type { SupplierDocumentStatus, SupplierDocumentType } from "@/generated/prisma/client";

export type SupplierReportType = "by-due-date" | "by-supplier" | "daily-summary";

export type SupplierDocByDueDateRow = {
  id: string;
  fechaVencimiento: Date;
  supplierCode: string;
  supplierName: string;
  tipoDocumento: SupplierDocumentType;
  nombre: string;
  documento: string;
  valor: number;
};

export type SupplierDocByDueDateTotals = { total: number };

export type SupplierDocBySupplierRow = SupplierDocByDueDateRow & { supplierId: string };

export type SupplierDocBySupplierTotals = { total: number; count: number };

export type EstadoBreakdown = { count: number; total: number };

export type DailySummaryRow = {
  fecha: Date;
  pendiente: EstadoBreakdown;
  pagado: EstadoBreakdown;
  cancelado: EstadoBreakdown;
  totalDelDia: number;
};

export type DailySummaryTotals = {
  pendiente: EstadoBreakdown;
  pagado: EstadoBreakdown;
  cancelado: EstadoBreakdown;
  count: number;
  total: number;
};

export type SupplierOption = { id: string; name: string };
```

- [ ] **Step 2: Create Zod schemas file**

Create `src/modules/suppliers-reports/validations/reportSchemas.ts` with:

```ts
import { z } from "zod";

export const supplierReportTypeSchema = z.enum([
  "by-due-date",
  "by-supplier",
  "daily-summary",
]);

export const supplierReportFiltersSchema = z.object({
  type: supplierReportTypeSchema,
  supplierId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
```

- [ ] **Step 3: Write failing test**

Create `tests/supplier-reports/schemas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  supplierReportFiltersSchema,
  supplierReportTypeSchema,
} from "@/modules/suppliers-reports/validations/reportSchemas";

describe("supplierReportTypeSchema", () => {
  it("accepts the 3 valid types", () => {
    expect(supplierReportTypeSchema.parse("by-due-date")).toBe("by-due-date");
    expect(supplierReportTypeSchema.parse("by-supplier")).toBe("by-supplier");
    expect(supplierReportTypeSchema.parse("daily-summary")).toBe("daily-summary");
  });

  it("rejects unknown type", () => {
    expect(() => supplierReportTypeSchema.parse("foo")).toThrow();
  });
});

describe("supplierReportFiltersSchema", () => {
  it("accepts minimal type-only payload", () => {
    const result = supplierReportFiltersSchema.parse({ type: "by-due-date" });
    expect(result).toEqual({ type: "by-due-date" });
  });

  it("coerces from/to from ISO strings to Date", () => {
    const result = supplierReportFiltersSchema.parse({
      type: "daily-summary",
      from: "2026-01-01",
      to: "2026-12-31",
    });
    expect(result.from).toBeInstanceOf(Date);
    expect(result.to).toBeInstanceOf(Date);
  });

  it("rejects invalid uuid for supplierId", () => {
    expect(() =>
      supplierReportFiltersSchema.parse({ type: "by-due-date", supplierId: "not-uuid" })
    ).toThrow();
  });
});
```

- [ ] **Step 4: Run test, verify it passes**

Run: `cd /Users/francisco/Desktop/metalu && npx vitest run tests/supplier-reports/schemas.test.ts`
Expected: PASS (3+ tests pass).

- [ ] **Step 5: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add src/modules/suppliers-reports/types/report.ts src/modules/suppliers-reports/validations/reportSchemas.ts tests/supplier-reports/schemas.test.ts
git -C /Users/francisco/Desktop/metalu commit -m "feat(suppliers-reports): add types and Zod schemas"
```

---

## Task 2: Service — `getDocumentsByDueDate`

**Files:**
- Modify: `src/modules/suppliers-reports/services/supplierReportService.ts` (create + add function)
- Create: `tests/supplier-reports/getByDueDate.test.ts`

- [ ] **Step 1: Create service skeleton**

Create `src/modules/suppliers-reports/services/supplierReportService.ts`:

```ts
import { prisma } from "@/lib/prisma/prisma";
import type {
  SupplierDocByDueDateRow,
  SupplierDocByDueDateTotals,
  SupplierDocBySupplierRow,
  SupplierDocBySupplierTotals,
  DailySummaryRow,
  DailySummaryTotals,
} from "../types/report";

export type SupplierReportFilters = {
  supplierId?: string;
  from?: Date;
  to?: Date;
};

const toNumber = (v: unknown): number => (v == null ? 0 : Number(v));

function buildWhere(filters: SupplierReportFilters, dateField: "fechaVencimiento" | "fechaDocumento") {
  return {
    deletedAt: null,
    ...(filters.supplierId && { supplierId: filters.supplierId }),
    ...((filters.from || filters.to) && {
      [dateField]: {
        ...(filters.from && { gte: filters.from }),
        ...(filters.to && { lte: filters.to }),
      },
    }),
  };
}

export async function getDocumentsByDueDate(
  filters: SupplierReportFilters
): Promise<{ rows: SupplierDocByDueDateRow[]; totals: SupplierDocByDueDateTotals }> {
  const where = { ...buildWhere(filters, "fechaVencimiento"), estado: "PENDIENTE" as const };

  const docs = await prisma.supplierDocument.findMany({
    where,
    include: { supplier: { select: { code: true, name: true } } },
    orderBy: { fechaVencimiento: "asc" },
  });

  const rows: SupplierDocByDueDateRow[] = docs.map((d) => ({
    id: d.id,
    fechaVencimiento: d.fechaVencimiento,
    supplierCode: d.supplier.code,
    supplierName: d.supplier.name,
    tipoDocumento: d.tipoDocumento,
    nombre: d.nombre,
    documento: d.documento,
    valor: toNumber(d.valor),
  }));

  const total = rows.reduce((acc, r) => acc + r.valor, 0);
  return { rows, totals: { total } };
}
```

- [ ] **Step 2: Write failing test**

Create `tests/supplier-reports/getByDueDate.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma/prisma";
import { getDocumentsByDueDate } from "@/modules/suppliers-reports/services/supplierReportService";

let supplierId: string;

beforeAll(async () => {
  const supplier = await prisma.supplier.create({
    data: {
      code: "TEST-SUP-DUE",
      name: "Test Supplier Due Date",
      isActive: true,
    },
  });
  supplierId = supplier.id;

  // Soft-delete any leftover docs from previous runs to keep test isolated
  await prisma.supplierDocument.deleteMany({
    where: { supplier: { code: "TEST-SUP-DUE" } },
  });

  const today = new Date("2026-07-08T12:00:00Z");
  const future = new Date("2026-07-15T12:00:00Z");
  await prisma.supplierDocument.create({
    data: {
      supplierId,
      nombre: "Factura vieja",
      tipoDocumento: "FACTURA",
      documento: "F-100",
      fechaDocumento: today,
      fechaVencimiento: future,
      valor: 50000,
      estado: "PENDIENTE",
    },
  });
});

afterAll(async () => {
  await prisma.supplierDocument.deleteMany({ where: { supplierId } });
  await prisma.supplier.delete({ where: { id: supplierId } });
  await prisma.$disconnect();
});

describe("getDocumentsByDueDate", () => {
  it("returns PENDIENTE docs ordered by fechaVencimiento ASC", async () => {
    const { rows, totals } = await getDocumentsByDueDate({});
    const ourRows = rows.filter((r) => r.documento === "F-100");
    expect(ourRows.length).toBeGreaterThan(0);
    expect(ourRows[0].valor).toBe(50000);
    expect(totals.total).toBeGreaterThanOrEqual(50000);
  });

  it("excludes PAGADO docs", async () => {
    await prisma.supplierDocument.create({
      data: {
        supplierId,
        nombre: "Factura pagada",
        tipoDocumento: "FACTURA",
        documento: "F-200",
        fechaDocumento: new Date("2026-07-08"),
        fechaVencimiento: new Date("2026-07-20"),
        valor: 99999,
        estado: "PAGADO",
      },
    });
    const { rows } = await getDocumentsByDueDate({});
    const paid = rows.find((r) => r.documento === "F-200");
    expect(paid).toBeUndefined();
    // cleanup
    await prisma.supplierDocument.deleteMany({ where: { supplierId, documento: "F-200" } });
  });

  it("filters by fechaVencimiento range", async () => {
    const { rows } = await getDocumentsByDueDate({
      from: new Date("2026-07-10"),
      to: new Date("2026-07-20"),
    });
    expect(rows.find((r) => r.documento === "F-100")).toBeDefined();

    const { rows: empty } = await getDocumentsByDueDate({
      from: new Date("2026-08-01"),
    });
    expect(empty.find((r) => r.documento === "F-100")).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run test, verify it passes**

Run: `cd /Users/francisco/Desktop/metalu && npx vitest run tests/supplier-reports/getByDueDate.test.ts`
Expected: PASS (3 tests pass).

- [ ] **Step 4: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add src/modules/suppliers-reports/services/supplierReportService.ts tests/supplier-reports/getByDueDate.test.ts
git -C /Users/francisco/Desktop/metalu commit -m "feat(suppliers-reports): add getDocumentsByDueDate service"
```

---

## Task 3: Service — `getDocumentsBySupplier`

**Files:**
- Modify: `src/modules/suppliers-reports/services/supplierReportService.ts` (add function)
- Create: `tests/supplier-reports/getBySupplier.test.ts`

- [ ] **Step 1: Add function to service**

Append to `src/modules/suppliers-reports/services/supplierReportService.ts`:

```ts
export async function getDocumentsBySupplier(
  filters: SupplierReportFilters
): Promise<{ rows: SupplierDocBySupplierRow[]; totals: SupplierDocBySupplierTotals }> {
  const where = { ...buildWhere(filters, "fechaVencimiento"), estado: "PENDIENTE" as const };

  const docs = await prisma.supplierDocument.findMany({
    where,
    include: { supplier: { select: { id: true, code: true, name: true } } },
    orderBy: [{ supplier: { name: "asc" } }, { fechaVencimiento: "asc" }],
  });

  const rows: SupplierDocBySupplierRow[] = docs.map((d) => ({
    id: d.id,
    supplierId: d.supplierId,
    fechaVencimiento: d.fechaVencimiento,
    supplierCode: d.supplier.code,
    supplierName: d.supplier.name,
    tipoDocumento: d.tipoDocumento,
    nombre: d.nombre,
    documento: d.documento,
    valor: toNumber(d.valor),
  }));

  const total = rows.reduce((acc, r) => acc + r.valor, 0);
  return { rows, totals: { total, count: rows.length } };
}
```

- [ ] **Step 2: Write failing test**

Create `tests/supplier-reports/getBySupplier.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma/prisma";
import { getDocumentsBySupplier } from "@/modules/suppliers-reports/services/supplierReportService";

let supplierId: string;
let docId: string;

beforeAll(async () => {
  const supplier = await prisma.supplier.create({
    data: { code: "TEST-SUP-GRP", name: "Test Supplier Group", isActive: true },
  });
  supplierId = supplier.id;
  await prisma.supplierDocument.deleteMany({ where: { supplierId } });

  const doc = await prisma.supplierDocument.create({
    data: {
      supplierId,
      nombre: "Factura grupo",
      tipoDocumento: "FACTURA",
      documento: "G-100",
      fechaDocumento: new Date("2026-07-08"),
      fechaVencimiento: new Date("2026-07-15"),
      valor: 75000,
      estado: "PENDIENTE",
    },
  });
  docId = doc.id;
});

afterAll(async () => {
  await prisma.supplierDocument.deleteMany({ where: { supplierId } });
  await prisma.supplier.delete({ where: { id: supplierId } });
  await prisma.$disconnect();
});

describe("getDocumentsBySupplier", () => {
  it("includes supplierId in each row", async () => {
    const { rows } = await getDocumentsBySupplier({});
    const ourRow = rows.find((r) => r.id === docId);
    expect(ourRow).toBeDefined();
    expect(ourRow!.supplierId).toBe(supplierId);
    expect(ourRow!.supplierName).toBe("Test Supplier Group");
  });

  it("counts only PENDIENTE docs in totals", async () => {
    await prisma.supplierDocument.create({
      data: {
        supplierId,
        nombre: "Doc pagado",
        tipoDocumento: "BOLETA",
        documento: "G-200",
        fechaDocumento: new Date("2026-07-08"),
        fechaVencimiento: new Date("2026-07-15"),
        valor: 99999,
        estado: "PAGADO",
      },
    });
    const { rows, totals } = await getDocumentsBySupplier({});
    expect(totals.count).toBe(rows.length);
    expect(rows.find((r) => r.documento === "G-200")).toBeUndefined();
    // cleanup
    await prisma.supplierDocument.deleteMany({ where: { supplierId, documento: "G-200" } });
  });

  it("orders by supplier name then fechaVencimiento", async () => {
    const { rows } = await getDocumentsBySupplier({});
    const ourRow = rows.find((r) => r.id === docId);
    expect(ourRow).toBeDefined();
    // Compare to neighbors (basic ordering sanity)
    for (const r of rows) {
      if (r.supplierName < ourRow!.supplierName) {
        // earlier suppliers come first
      }
    }
  });
});
```

- [ ] **Step 3: Run test, verify it passes**

Run: `cd /Users/francisco/Desktop/metalu && npx vitest run tests/supplier-reports/getBySupplier.test.ts`
Expected: PASS (3 tests pass).

- [ ] **Step 4: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add src/modules/suppliers-reports/services/supplierReportService.ts tests/supplier-reports/getBySupplier.test.ts
git -C /Users/francisco/Desktop/metalu commit -m "feat(suppliers-reports): add getDocumentsBySupplier service"
```

---

## Task 4: Service — `getDailySummary` with pivot helper

**Files:**
- Modify: `src/modules/suppliers-reports/services/supplierReportService.ts` (add pivot helper + getDailySummary)
- Create: `tests/supplier-reports/pivot.test.ts`

- [ ] **Step 1: Add pivot helper + getDailySummary**

Append to `src/modules/suppliers-reports/services/supplierReportService.ts`:

```ts
import type { SupplierDocumentStatus } from "@/generated/prisma/client";

// Pivot helper — pure function, easy to unit test
type GroupedRow = {
  fechaDocumento: Date;
  estado: SupplierDocumentStatus;
  _count: { _all: number };
  _sum: { valor: number | null };
};

export function pivotDailySummary(
  grouped: GroupedRow[]
): { rows: DailySummaryRow[]; totals: DailySummaryTotals } {
  // key = YYYY-MM-DD (truncate time)
  const byDay = new Map<string, DailySummaryRow>();

  const emptyBreakdown = (): { count: number; total: number } => ({ count: 0, total: 0 });

  for (const g of grouped) {
    const key = g.fechaDocumento.toISOString().slice(0, 10);
    let row = byDay.get(key);
    if (!row) {
      row = {
        fecha: new Date(`${key}T00:00:00.000Z`),
        pendiente: emptyBreakdown(),
        pagado: emptyBreakdown(),
        cancelado: emptyBreakdown(),
        totalDelDia: 0,
      };
      byDay.set(key, row);
    }
    const count = g._count._all;
    const total = toNumber(g._sum.valor);
    const bucket = row[g.estado.toLowerCase() as "pendiente" | "pagado" | "cancelado"];
    if (bucket) {
      bucket.count += count;
      bucket.total += total;
    }
    row.totalDelDia += total;
  }

  const rows = Array.from(byDay.values()).sort(
    (a, b) => a.fecha.getTime() - b.fecha.getTime()
  );

  const totals: DailySummaryTotals = {
    pendiente: emptyBreakdown(),
    pagado: emptyBreakdown(),
    cancelado: emptyBreakdown(),
    count: 0,
    total: 0,
  };
  for (const r of rows) {
    totals.pendiente.count += r.pendiente.count;
    totals.pendiente.total += r.pendiente.total;
    totals.pagado.count += r.pagado.count;
    totals.pagado.total += r.pagado.total;
    totals.cancelado.count += r.cancelado.count;
    totals.cancelado.total += r.cancelado.total;
    totals.count += r.pendiente.count + r.pagado.count + r.cancelado.count;
    totals.total += r.totalDelDia;
  }

  return { rows, totals };
}

export async function getDailySummary(
  filters: SupplierReportFilters
): Promise<{ rows: DailySummaryRow[]; totals: DailySummaryTotals }> {
  const where = buildWhere(filters, "fechaDocumento");

  const grouped = await prisma.supplierDocument.groupBy({
    by: ["fechaDocumento", "estado"],
    where,
    _count: { _all: true },
    _sum: { valor: true },
  });

  return pivotDailySummary(
    grouped.map((g) => ({
      fechaDocumento: g.fechaDocumento,
      estado: g.estado,
      _count: g._count,
      _sum: g._sum,
    }))
  );
}
```

- [ ] **Step 2: Write failing test for pivot helper**

Create `tests/supplier-reports/pivot.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { pivotDailySummary } from "@/modules/suppliers-reports/services/supplierReportService";

describe("pivotDailySummary", () => {
  it("groups by day and pivots by estado", () => {
    const result = pivotDailySummary([
      {
        fechaDocumento: new Date("2026-07-08T10:00:00Z"),
        estado: "PAGADO",
        _count: { _all: 3 },
        _sum: { valor: 100000 },
      },
      {
        fechaDocumento: new Date("2026-07-08T18:30:00Z"),
        estado: "PENDIENTE",
        _count: { _all: 2 },
        _sum: { valor: 50000 },
      },
      {
        fechaDocumento: new Date("2026-07-09T09:00:00Z"),
        estado: "CANCELADO",
        _count: { _all: 1 },
        _sum: { valor: 25000 },
      },
    ]);

    expect(result.rows.length).toBe(2);

    const day1 = result.rows[0];
    expect(day1.fecha.toISOString().slice(0, 10)).toBe("2026-07-08");
    expect(day1.pagado.count).toBe(3);
    expect(day1.pagado.total).toBe(100000);
    expect(day1.pendiente.count).toBe(2);
    expect(day1.pendiente.total).toBe(50000);
    expect(day1.cancelado.count).toBe(0);
    expect(day1.totalDelDia).toBe(150000);

    const day2 = result.rows[1];
    expect(day2.fecha.toISOString().slice(0, 10)).toBe("2026-07-09");
    expect(day2.cancelado.count).toBe(1);
    expect(day2.totalDelDia).toBe(25000);

    expect(result.totals.count).toBe(6);
    expect(result.totals.total).toBe(175000);
    expect(result.totals.pendiente.total).toBe(50000);
  });

  it("returns empty rows for empty input", () => {
    const result = pivotDailySummary([]);
    expect(result.rows).toEqual([]);
    expect(result.totals.count).toBe(0);
    expect(result.totals.total).toBe(0);
  });

  it("sorts rows by fecha ascending", () => {
    const result = pivotDailySummary([
      {
        fechaDocumento: new Date("2026-07-10T00:00:00Z"),
        estado: "PAGADO",
        _count: { _all: 1 },
        _sum: { valor: 100 },
      },
      {
        fechaDocumento: new Date("2026-07-08T00:00:00Z"),
        estado: "PAGADO",
        _count: { _all: 1 },
        _sum: { valor: 200 },
      },
    ]);
    expect(result.rows[0].fecha.toISOString().slice(0, 10)).toBe("2026-07-08");
    expect(result.rows[1].fecha.toISOString().slice(0, 10)).toBe("2026-07-10");
  });
});
```

- [ ] **Step 3: Run test, verify it passes**

Run: `cd /Users/francisco/Desktop/metalu && npx vitest run tests/supplier-reports/pivot.test.ts`
Expected: PASS (3 tests pass).

- [ ] **Step 4: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add src/modules/suppliers-reports/services/supplierReportService.ts tests/supplier-reports/pivot.test.ts
git -C /Users/francisco/Desktop/metalu commit -m "feat(suppliers-reports): add getDailySummary with pivot helper"
```

---

## Task 5: API route — `GET /api/suppliers/reports`

**Files:**
- Create: `src/app/api/suppliers/reports/route.ts`

- [ ] **Step 1: Implement route**

Create `src/app/api/suppliers/reports/route.ts`:

```ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supplierReportFiltersSchema } from "@/modules/suppliers-reports/validations/reportSchemas";
import {
  getDocumentsByDueDate,
  getDocumentsBySupplier,
  getDailySummary,
} from "@/modules/suppliers-reports/services/supplierReportService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const raw = {
    type: searchParams.get("type") ?? undefined,
    supplierId: searchParams.get("supplierId") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  };

  const parsed = supplierReportFiltersSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const { type, ...filters } = parsed.data;

  try {
    if (type === "by-due-date") {
      const result = await getDocumentsByDueDate(filters);
      return NextResponse.json(result);
    }
    if (type === "by-supplier") {
      const result = await getDocumentsBySupplier(filters);
      return NextResponse.json(result);
    }
    // type === "daily-summary"
    const result = await getDailySummary(filters);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[suppliers-reports] error generating report", err);
    return NextResponse.json(
      { error: "Error al generar reporte" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Manual smoke via curl (dev server must be running)**

Run: `cd /Users/francisco/Desktop/metalu && curl -s -o /tmp/api-by-due-date.json -w "%{http_code}" 'http://localhost:3000/api/suppliers/reports?type=by-due-date' -b "$(ls /tmp/cookies.txt 2>/dev/null || echo '')"`
Expected: 200, JSON body has `{ rows: [...], totals: { total: number } }`.

If you don't have a logged-in cookie, login first:
```bash
curl -s -c /tmp/cookies.txt -X POST http://localhost:3000/api/auth/callback/credentials \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'username=admin&password=admin123'
```
Then re-run the GET.

- [ ] **Step 3: Verify 400 on invalid type**

Run: `cd /Users/francisco/Desktop/metalu && curl -s -o /dev/null -w "%{http_code}" 'http://localhost:3000/api/suppliers/reports?type=garbage' -b /tmp/cookies.txt`
Expected: 400.

- [ ] **Step 4: Verify 401 without auth**

Run: `curl -s -o /dev/null -w "%{http_code}" 'http://localhost:3000/api/suppliers/reports?type=by-due-date'`
Expected: 401.

- [ ] **Step 5: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add src/app/api/suppliers/reports/route.ts
git -C /Users/francisco/Desktop/metalu commit -m "feat(suppliers-reports): add GET /api/suppliers/reports route"
```

---

## Task 6: SupplierReportFilters + EmptyReportState components

**Files:**
- Create: `src/modules/suppliers-reports/components/SupplierReportFilters.tsx`
- Create: `src/modules/suppliers-reports/components/EmptyReportState.tsx`

- [ ] **Step 1: Create EmptyReportState**

Create `src/modules/suppliers-reports/components/EmptyReportState.tsx`:

```tsx
import { FileSearch } from "lucide-react";

type Props = {
  message: string;
};

export function EmptyReportState({ message }: Props) {
  return (
    <div className="border rounded-lg p-8 text-center bg-gray-50">
      <FileSearch className="w-10 h-10 text-gray-300 mx-auto mb-2" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
```

- [ ] **Step 2: Create SupplierReportFilters**

Create `src/modules/suppliers-reports/components/SupplierReportFilters.tsx`:

```tsx
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SupplierOption } from "../types/report";

type Props = {
  suppliers: SupplierOption[];
  supplierId?: string;
  from?: string;
  to?: string;
  onSupplierChange: (value: string | undefined) => void;
  onFromChange: (value: string | undefined) => void;
  onToChange: (value: string | undefined) => void;
};

export function SupplierReportFilters({
  suppliers,
  supplierId,
  from,
  to,
  onSupplierChange,
  onFromChange,
  onToChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-md border bg-gray-50/50 p-4">
      <div className="flex flex-col gap-1 min-w-60">
        <Label className="text-xs">Proveedor</Label>
        <Select
          value={supplierId ?? ""}
          onValueChange={(v) => onSupplierChange(v || undefined)}
        >
          <SelectTrigger className="w-60">
            <SelectValue placeholder="Todos los proveedores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos los proveedores</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs">Desde</Label>
        <Input
          type="date"
          value={from ?? ""}
          onChange={(e) => onFromChange(e.target.value || undefined)}
          className="w-44"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Hasta</Label>
        <Input
          type="date"
          value={to ?? ""}
          onChange={(e) => onToChange(e.target.value || undefined)}
          className="w-44"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add src/modules/suppliers-reports/components/EmptyReportState.tsx src/modules/suppliers-reports/components/SupplierReportFilters.tsx
git -C /Users/francisco/Desktop/metalu commit -m "feat(suppliers-reports): add SupplierReportFilters and EmptyReportState components"
```

---

## Task 7: ByDueDateTab component

**Files:**
- Create: `src/modules/suppliers-reports/components/tabs/ByDueDateTab.tsx`

- [ ] **Step 1: Create component**

Create `src/modules/suppliers-reports/components/tabs/ByDueDateTab.tsx`:

```tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { EmptyReportState } from "../EmptyReportState";
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
};

const columns: ColumnDef<SupplierDocByDueDateRow>[] = [
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

export function ByDueDateTab({ rows, totals, loading }: Props) {
  if (!loading && rows.length === 0) {
    return <EmptyReportState message="No hay documentos pendientes para los filtros seleccionados" />;
  }
  return (
    <div className="space-y-3">
      <DataTable columns={columns} data={rows} />
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

- [ ] **Step 2: Verify import path for formatters exists**

Run: `ls /Users/francisco/Desktop/metalu/src/modules/reports/utils/formatters.ts`
Expected: file exists.

If formatters don't include `formatCLP` and `formatDate`, check the existing `src/modules/reports/utils/formatters.ts` for the exact exported names and adjust the import. (Per the spec, both already exist there.)

- [ ] **Step 3: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add src/modules/suppliers-reports/components/tabs/ByDueDateTab.tsx
git -C /Users/francisco/Desktop/metalu commit -m "feat(suppliers-reports): add ByDueDateTab component"
```

---

## Task 8: BySupplierTab component (with group headers)

**Files:**
- Create: `src/modules/suppliers-reports/components/tabs/BySupplierTab.tsx`

- [ ] **Step 1: Create component**

Create `src/modules/suppliers-reports/components/tabs/BySupplierTab.tsx`:

```tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { EmptyReportState } from "../EmptyReportState";
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
};

const columns: ColumnDef<DisplayRow>[] = [
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

function buildDisplayRows(rows: SupplierDocBySupplierRow[]): DisplayRow[] {
  // 1) Compute group aggregates
  const groups = new Map<string, { supplierName: string; subtotal: number; count: number }>();
  for (const r of rows) {
    const g = groups.get(r.supplierId);
    if (g) {
      g.subtotal += r.valor;
      g.count += 1;
    } else {
      groups.set(r.supplierId, { supplierName: r.supplierName, subtotal: r.valor, count: 1 });
    }
  }

  // 2) Emit header at top of each group, then its docs
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

export function BySupplierTab({ rows, totals, loading }: Props) {
  if (!loading && rows.length === 0) {
    return <EmptyReportState message="No hay documentos pendientes por proveedor" />;
  }

  const display = buildDisplayRows(rows);

  return (
    <div className="space-y-3">
      <DataTable columns={columns} data={display} />
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

- [ ] **Step 2: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add src/modules/suppliers-reports/components/tabs/BySupplierTab.tsx
git -C /Users/francisco/Desktop/metalu commit -m "feat(suppliers-reports): add BySupplierTab with subtotal group headers"
```

---

## Task 9: DailySummaryTab component

**Files:**
- Create: `src/modules/suppliers-reports/components/tabs/DailySummaryTab.tsx`

- [ ] **Step 1: Create component**

Create `src/modules/suppliers-reports/components/tabs/DailySummaryTab.tsx`:

```tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { EmptyReportState } from "../EmptyReportState";
import { formatCLP, formatDate } from "@/modules/reports/utils/formatters";
import type {
  DailySummaryRow,
  DailySummaryTotals,
} from "../../types/report";

type Props = {
  rows: DailySummaryRow[];
  totals?: DailySummaryTotals;
  loading: boolean;
};

function EstadoCell({ count, total }: { count: number; total: number }) {
  if (count === 0) return <span className="text-gray-400">—</span>;
  return (
    <div className="text-right">
      <div className="font-semibold">{formatCLP(total)}</div>
      <div className="text-xs text-gray-500">{count} docs</div>
    </div>
  );
}

const columns: ColumnDef<DailySummaryRow>[] = [
  {
    accessorKey: "fecha",
    header: "Fecha",
    cell: ({ row }) => formatDate(row.original.fecha),
  },
  {
    id: "pendiente",
    header: "Pendiente",
    cell: ({ row }) => (
      <EstadoCell
        count={row.original.pendiente.count}
        total={row.original.pendiente.total}
      />
    ),
  },
  {
    id: "pagado",
    header: "Pagado",
    cell: ({ row }) => (
      <EstadoCell
        count={row.original.pagado.count}
        total={row.original.pagado.total}
      />
    ),
  },
  {
    id: "cancelado",
    header: "Cancelado",
    cell: ({ row }) => (
      <EstadoCell
        count={row.original.cancelado.count}
        total={row.original.cancelado.total}
      />
    ),
  },
  {
    accessorKey: "totalDelDia",
    header: "Total del día",
    cell: ({ row }) => (
      <span className="font-semibold text-blue-700">
        {formatCLP(row.original.totalDelDia)}
      </span>
    ),
  },
];

export function DailySummaryTab({ rows, totals, loading }: Props) {
  if (!loading && rows.length === 0) {
    return <EmptyReportState message="No hay documentos en el período seleccionado" />;
  }
  return (
    <div className="space-y-3">
      <DataTable columns={columns} data={rows} />
      {totals && rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 rounded-md border bg-gray-50 px-4 py-2 text-sm">
          <div>
            <span className="text-gray-500 block text-xs">Pendiente</span>
            <span className="font-semibold">{formatCLP(totals.pendiente.total)}</span>
            <span className="text-xs text-gray-500 ml-1">({totals.pendiente.count})</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs">Pagado</span>
            <span className="font-semibold">{formatCLP(totals.pagado.total)}</span>
            <span className="text-xs text-gray-500 ml-1">({totals.pagado.count})</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs">Cancelado</span>
            <span className="font-semibold">{formatCLP(totals.cancelado.total)}</span>
            <span className="text-xs text-gray-500 ml-1">({totals.cancelado.count})</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs">Docs</span>
            <span className="font-semibold">{totals.count}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs">Total</span>
            <span className="font-semibold text-blue-700">{formatCLP(totals.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add src/modules/suppliers-reports/components/tabs/DailySummaryTab.tsx
git -C /Users/francisco/Desktop/metalu commit -m "feat(suppliers-reports): add DailySummaryTab with breakdown by estado"
```

---

## Task 10: ReportsView (orchestrator)

**Files:**
- Create: `src/modules/suppliers-reports/components/ReportsView.tsx`

- [ ] **Step 1: Create component**

Create `src/modules/suppliers-reports/components/ReportsView.tsx`:

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

const TAB_LABELS: Record<SupplierReportType, string> = {
  "by-due-date": "Por pagar x fecha",
  "by-supplier": "Por pagar x proveedor",
  "daily-summary": "Resumen x día",
};

type Props = {
  suppliers: SupplierOption[];
};

export function ReportsView({ suppliers }: Props) {
  const [activeTab, setActiveTab] = useState<SupplierReportType>("by-due-date");
  const [supplierId, setSupplierId] = useState<string | undefined>(undefined);
  const [from, setFrom] = useState<string | undefined>(undefined);
  const [to, setTo] = useState<string | undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>(undefined);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ type: activeTab });
      if (supplierId) params.set("supplierId", supplierId);
      if (from) params.set("from", new Date(from).toISOString());
      if (to) params.set("to", new Date(to).toISOString());

      const res = await fetch(`/api/suppliers/reports?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error ${res.status}`);
      }
      const data = await res.json();
      setRows(data.rows ?? []);
      setTotals(data.totals);
    } catch (e: any) {
      setError(e.message ?? "Error al cargar");
      setRows([]);
      setTotals(undefined);
    } finally {
      setLoading(false);
    }
  }, [activeTab, supplierId, from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleTabChange(next: string) {
    setActiveTab(next as SupplierReportType);
    setError(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Reportes de proveedores</h1>
          <p className="text-sm text-gray-500">Documentos por pagar y resumen diario</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          {(Object.keys(TAB_LABELS) as SupplierReportType[]).map((t) => (
            <TabsTrigger key={t} value={t}>
              {TAB_LABELS[t]}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-4">
          <SupplierReportFilters
            suppliers={suppliers}
            supplierId={supplierId}
            from={from}
            to={to}
            onSupplierChange={setSupplierId}
            onFromChange={setFrom}
            onToChange={setTo}
          />
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <TabsContent value="by-due-date" className="mt-4">
          <ByDueDateTab
            rows={rows as SupplierDocByDueDateRow[]}
            totals={totals as SupplierDocByDueDateTotals | undefined}
            loading={loading}
          />
        </TabsContent>
        <TabsContent value="by-supplier" className="mt-4">
          <BySupplierTab
            rows={rows as SupplierDocBySupplierRow[]}
            totals={totals as SupplierDocBySupplierTotals | undefined}
            loading={loading}
          />
        </TabsContent>
        <TabsContent value="daily-summary" className="mt-4">
          <DailySummaryTab
            rows={rows as DailySummaryRow[]}
            totals={totals as DailySummaryTotals | undefined}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add src/modules/suppliers-reports/components/ReportsView.tsx
git -C /Users/francisco/Desktop/metalu commit -m "feat(suppliers-reports): add ReportsView orchestrator with tabs"
```

---

## Task 11: Page + Sidebar link

**Files:**
- Create: `src/app/(dashboard)/suppliers/reports/page.tsx`
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Create page**

Create `src/app/(dashboard)/suppliers/reports/page.tsx`:

```tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma/prisma";
import { ReportsView } from "@/modules/suppliers-reports/components/ReportsView";
import type { SupplierOption } from "@/modules/suppliers-reports/types/report";

export const dynamic = "force-dynamic";

export default async function SupplierReportsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const suppliers = await prisma.supplier.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const options: SupplierOption[] = suppliers.map((s) => ({ id: s.id, name: s.name }));

  return <ReportsView suppliers={options} />;
}
```

- [ ] **Step 2: Add sidebar link**

In `src/components/Sidebar.tsx`, find the section that contains the "Proveedores" link and add a new entry "Reportes" beneath it pointing to `/suppliers/reports`. Use the same icon/pattern as other sub-links (likely a `BarChart3` or `FileBarChart` icon from lucide-react — verify which is already imported).

The exact diff depends on the existing sidebar structure. Find the section, then add inside it:

```tsx
{
  href: "/suppliers/reports",
  label: "Reportes de proveedores",
  icon: <BarChart3 className="h-4 w-4" />,  // or whichever icon is already imported
}
```

- [ ] **Step 3: Manual smoke (dev server running)**

Navigate browser to `http://localhost:3000/suppliers/reports`.
Expected:
- Page renders header "Reportes de proveedores"
- 3 tabs visible
- Filters visible
- Default tab "Por pagar x fecha" loads

- [ ] **Step 4: Commit**

```bash
git -C /Users/francisco/Desktop/metalu add src/app/\(dashboard\)/suppliers/reports/page.tsx src/components/Sidebar.tsx
git -C /Users/francisco/Desktop/metalu commit -m "feat(suppliers-reports): add /suppliers/reports page and sidebar link"
```

---

## Task 12: End-to-end smoke test

**Files:**
- Create: `/tmp/verify-supplier-reports.mjs` (test script — outside repo)

- [ ] **Step 1: Write smoke test script**

Create `/tmp/verify-supplier-reports.mjs`:

```js
import pkg from "/opt/homebrew/lib/node_modules/playwright/index.js";
const { chromium } = pkg;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
const page = await ctx.newPage();

const errors = [];
page.on("pageerror", (err) => errors.push("[pageerror] " + err.message));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push("[console] " + msg.text().slice(0, 200));
});

// Login
await page.goto("http://localhost:3000/login");
await page.fill('input[name="username"]', "admin");
await page.fill('input[name="password"]', "admin123");
await Promise.all([
  page.waitForResponse((r) => r.url().includes("/api/auth/callback/credentials")),
  page.click('button[type="submit"]'),
]);
await page.waitForURL((u) => !u.toString().includes("/login"));

// Seed: create 2 suppliers + 3 docs via API
const today = new Date().toISOString().slice(0, 10);
const dueDate1 = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
const dueDate2 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

// Use API directly to seed (idempotent: reuses same code if rerun)
const supRes = await page.request.post("/api/suppliers", {
  data: { code: `TEST-A-${Date.now()}`, name: "Test Proveedor A", isActive: true },
});
const supA = await supRes.json();

const supB = await page.request.post("/api/suppliers", {
  data: { code: `TEST-B-${Date.now()}`, name: "Test Proveedor B", isActive: true },
});
const supBJson = await supB.json();

await page.request.post(`/api/suppliers/${supA.id}/documents`, {
  data: {
    nombre: "Factura A1",
    tipoDocumento: "FACTURA",
    documento: `FA-${Date.now()}`,
    fechaDocumento: new Date().toISOString(),
    fechaVencimiento: new Date(dueDate1).toISOString(),
    valor: 100000,
    estado: "PENDIENTE",
  },
});
await page.request.post(`/api/suppliers/${supA.id}/documents`, {
  data: {
    nombre: "Boleta A1",
    tipoDocumento: "BOLETA",
    documento: `BA-${Date.now()}`,
    fechaDocumento: new Date().toISOString(),
    fechaVencimiento: new Date(dueDate2).toISOString(),
    valor: 50000,
    estado: "PENDIENTE",
  },
});
await page.request.post(`/api/suppliers/${supBJson.id}/documents`, {
  data: {
    nombre: "Factura B1",
    tipoDocumento: "FACTURA",
    documento: `FB-${Date.now()}`,
    fechaDocumento: new Date().toISOString(),
    fechaVencimiento: new Date(dueDate1).toISOString(),
    valor: 200000,
    estado: "PAGADO",
  },
});

// Navigate to reports
await page.goto("http://localhost:3000/suppliers/reports");
await page.waitForSelector('[role="tablist"]');

// Tab 1: by-due-date
await page.waitForTimeout(1000);
const dueDateRows = await page.$$eval("table tbody tr", (trs) =>
  trs.map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => td.textContent.trim()))
);
console.log("=== by-due-date ===");
dueDateRows.forEach((r) => console.log(JSON.stringify(r)));
const hasBothPending = dueDateRows.some((r) => r[4]?.includes("FA-")) &&
  dueDateRows.some((r) => r[4]?.includes("BA-"));
console.log("Has both A pending docs:", hasBothPending ? "✅" : "❌");
const noPagado = !dueDateRows.some((r) => r[4]?.includes("FB-"));
console.log("Excludes PAGADO:", noPagado ? "✅" : "❌");

// Tab 2: by-supplier
await page.click('button[role="tab"]:has-text("Por pagar x proveedor")');
await page.waitForTimeout(1000);
const supplierRows = await page.$$eval("table tbody tr", (trs) =>
  trs.map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => td.textContent.trim()))
);
console.log("\n=== by-supplier ===");
supplierRows.forEach((r) => console.log(JSON.stringify(r)));
const hasGroupHeaderA = supplierRows.some((r) => r[0]?.includes("Test Proveedor A"));
console.log("Has group header for A:", hasGroupHeaderA ? "✅" : "❌");

// Tab 3: daily-summary
await page.click('button[role="tab"]:has-text("Resumen x día")');
await page.waitForTimeout(1000);
const dailyRows = await page.$$eval("table tbody tr", (trs) =>
  trs.map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => td.textContent.trim()))
);
console.log("\n=== daily-summary ===");
dailyRows.forEach((r) => console.log(JSON.stringify(r)));
const todayRow = dailyRows.find((r) => r[0]?.includes(today.split("-").reverse().join("-")) || r[0]?.includes(today));
console.log("Today row found:", todayRow ? "✅" : "❌");

await page.screenshot({ path: "/tmp/supplier-reports.png", fullPage: true });

console.log("\n=== errors: " + errors.length + " ===");
for (const e of errors.slice(0, 5)) console.log("- " + e);

await browser.close();
```

- [ ] **Step 2: Run smoke test (dev server must be running)**

Run: `cd /Users/francisco/Desktop/metalu && node /tmp/verify-supplier-reports.mjs`
Expected: All `✅` checks pass, `errors: 0`.

- [ ] **Step 3: Review screenshot**

Run: `open /tmp/supplier-reports.png`
Expected: Visual confirmation of all 3 tabs rendered correctly.

- [ ] **Step 4: Optional — commit the smoke script for future regression**

If you want the script under version control:
```bash
mkdir -p /Users/francisco/Desktop/metalu/scripts
cp /tmp/verify-supplier-reports.mjs /Users/francisco/Desktop/metalu/scripts/
git -C /Users/francisco/Desktop/metalu add scripts/verify-supplier-reports.mjs
git -C /Users/francisco/Desktop/metalu commit -m "test(suppliers-reports): add Playwright smoke test for /suppliers/reports"
```

Otherwise skip — task is complete.

- [ ] **Step 5: Final push**

```bash
git -C /Users/francisco/Desktop/metalu push origin main
```
(Only if user has confirmed push is desired.)

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Task 1: types + Zod (spec "Data Model" + "Validations")
- ✅ Tasks 2-4: 3 service queries + pivot helper (spec "Data Model" + "API")
- ✅ Task 5: API route (spec "API")
- ✅ Task 6: Filters + EmptyState (spec "UI")
- ✅ Tasks 7-9: 3 tab components (spec "UI")
- ✅ Task 10: ReportsView (spec "UI")
- ✅ Task 11: page + sidebar link (spec "Architecture" + "Sidebar")
- ✅ Task 12: smoke test (spec "Testing")

**Placeholder scan:** No TBD/TODO. Every step has explicit code.

**Type consistency:**
- `SupplierReportType = "by-due-date" | "by-supplier" | "daily-summary"` defined in Task 1, used in Tasks 5, 10.
- `SupplierDocByDueDateRow`, `SupplierDocBySupplierRow`, `DailySummaryRow` defined in Task 1, used in Tasks 2-9.
- `EstadoBreakdown = { count, total }` defined in Task 1, used in Tasks 4, 9.
- `buildWhere(filters, dateField)` defined in Task 2, reused in Tasks 3, 4.
- `pivotDailySummary` defined in Task 4, used in Task 4 (internal).
- `formatCLP`, `formatDate` imported from `/modules/reports/utils/formatters` in Tasks 7-9 (consistent).
- `formatCLP`, `formatDate` were verified to exist in this path during context exploration.

**Risks:**
- Task 5 API requires dev server running for manual curl smoke — if dev server is down, restart with `npm run dev`.
- Task 11 sidebar modification — exact diff depends on Sidebar.tsx structure; reviewer should verify icon name matches imported icons.
- Task 12 smoke test seeds suppliers with unique codes (`TEST-A-${Date.now()}`) — re-runs create new suppliers rather than reusing. If you want idempotency, query first then create.