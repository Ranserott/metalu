# Reports PDF Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-tab "Exportar PDF" button to `/reports` and `/suppliers/reports` that downloads the active tab's current view as a standalone PDF, mirroring the on-screen filters + rows + totals.

**Architecture:** Server-side PDF render via `@react-pdf/renderer`. Each module gets a dispatcher component (`ReportsPdf` / `SupplierReportsPdf`) with a `switch (type)` that renders the per-tab section. API routes `/api/reports/pdf` and `/api/suppliers/reports/pdf` re-execute the same service the JSON API uses, render the PDF, return the buffer. Existing JSON endpoints are untouched (one refactor: extract `runReport` in `reportService.ts` to avoid duplicating the type→query switch).

**Tech Stack:** Next.js 15 (App Router), `@react-pdf/renderer`, Prisma, Vitest, React 19, shadcn/ui (base-ui), lucide-react.

**Working directory:** `/Users/francisco/Desktop/metalu/` — never in a worktree. Always prepend `git -C /Users/francisco/Desktop/metalu/` to git commands.

**Spec:** `docs/superpowers/specs/2026-07-15-reports-pdf-export-design.md`

---

## Task 1: `runReport` helper — failing tests

**Files:**
- Create: `tests/reports/runReport.test.ts`

- [ ] **Step 1: Create the test file**

```ts
// tests/reports/runReport.test.ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma/prisma";
import { runReport } from "@/modules/reports/services/reportService";

let clientId: string;
let clientCode = "TEST-RUN-REPORT";

beforeAll(async () => {
  await prisma.client.deleteMany({ where: { code: clientCode } });
  const client = await prisma.client.create({
    data: {
      code: clientCode,
      name: "Test Client Run Report",
      isActive: true,
    },
  });
  clientId = client.id;
});

afterAll(async () => {
  await prisma.client.deleteMany({ where: { code: clientCode } });
  await prisma.$disconnect();
});

describe("runReport", () => {
  it("throws on unknown type", async () => {
    await expect(
      runReport("nope" as any, {})
    ).rejects.toThrow(/tipo de reporte inválido/i);
  });

  it("returns cartola rows + totals when clientId provided", async () => {
    const result = await runReport("cartola", { clientId });
    expect(result).toHaveProperty("rows");
    expect(result).toHaveProperty("totals");
    expect(result.totals).toHaveProperty("cargos");
    expect(result.totals).toHaveProperty("abonos");
    expect(result.totals).toHaveProperty("saldoFinal");
  });

  it("returns sales rows + totals with optional clientId", async () => {
    const result = await runReport("sales", {});
    expect(Array.isArray(result.rows)).toBe(true);
    expect(result.totals).toHaveProperty("neto");
    expect(result.totals).toHaveProperty("iva");
    expect(result.totals).toHaveProperty("total");
  });

  it("returns balances rows + totals", async () => {
    const result = await runReport("balances", {});
    expect(Array.isArray(result.rows)).toBe(true);
    expect(result.totals).toHaveProperty("saldoActual");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/reports/runReport.test.ts`
Expected: FAIL with "Cannot find module '@/modules/reports/services/reportService'" or "runReport is not a function".

- [ ] **Step 3: Commit (test only, no implementation yet)**

```bash
git -C /Users/francisco/Desktop/metalu/ add tests/reports/runReport.test.ts
git -C /Users/francisco/Desktop/metalu/ commit -m "test(reports): add failing tests for runReport helper"
```

---

## Task 2: `runReport` helper — implementation

**Files:**
- Modify: `src/modules/reports/services/reportService.ts`

- [ ] **Step 1: Append `runReport` to the existing service file**

Add at the bottom of `src/modules/reports/services/reportService.ts`:

```ts
export type RunReportFilters = {
  clientId?: string;
  from?: string;
  to?: string;
};

export async function runReport(
  type: ReportType,
  filters: RunReportFilters
): Promise<{ rows: unknown[]; totals?: Record<string, number> }> {
  const fromDate = filters.from ? new Date(filters.from) : undefined;
  const toDate = filters.to ? new Date(filters.to) : undefined;
  const baseFilters = {
    clientId: filters.clientId,
    from: fromDate,
    to: toDate,
  };

  switch (type) {
    case "cartola":
      if (!filters.clientId) {
        throw new Error("cartola requiere clientId");
      }
      return getCartola(baseFilters as CartolaFilters);
    case "pending-invoices":
      return getPendingInvoices(baseFilters as PendingFilters);
    case "sales":
      return getSales(baseFilters as SalesFilters);
    case "payments":
      return getPayments(baseFilters as PaymentsFilters);
    case "credit-notes":
      return getCreditNotes(baseFilters as CreditNotesFilters);
    case "balances":
      return getBalances({ clientId: filters.clientId } as BalancesFilters);
    default:
      throw new Error("Tipo de reporte inválido");
  }
}
```

Also add this import at the top of the same file (alongside existing imports from `"../types/report"`):

```ts
import type { ReportType } from "../types/report";
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm test -- tests/reports/runReport.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 3: Commit**

```bash
git -C /Users/francisco/Desktop/metalu/ add src/modules/reports/services/reportService.ts
git -C /Users/francisco/Desktop/metalu/ commit -m "feat(reports): add runReport helper to reportService"
```

---

## Task 3: Refactor `/api/reports/route.ts` to use `runReport`

**Files:**
- Modify: `src/app/api/reports/route.ts`

- [ ] **Step 1: Replace the route body**

Replace the entire content of `src/app/api/reports/route.ts` with:

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { ReportFiltersSchema } from "@/modules/reports/validations/reportSchemas";
import { runReport } from "@/modules/reports/services/reportService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const raw = {
    type: searchParams.get("type") ?? undefined,
    clientId: searchParams.get("clientId") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  };

  const parsed = ReportFiltersSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { type, clientId, from, to } = parsed.data;

  try {
    const result = await runReport(type, { clientId, from, to });
    return NextResponse.json(result);
  } catch (error: any) {
    if (/requiere|inválido/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[GET /api/reports] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Manual smoke test**

1. Restart dev server (`npm run dev` if not running).
2. Login → open `/reports` in browser.
3. Click each tab, apply filters where needed, verify the table renders identically to before.
4. Verify browser console has no errors. Verify `/api/reports?type=balances` returns the same shape it did before (use browser network tab).

- [ ] **Step 3: Commit**

```bash
git -C /Users/francisco/Desktop/metalu/ add src/app/api/reports/route.ts
git -C /Users/francisco/Desktop/metalu/ commit -m "refactor(reports): route uses runReport helper"
```

---

## Task 4: `reportFilename` helper — tests + implementation

**Files:**
- Create: `tests/reports/reportFilename.test.ts`
- Create: `src/modules/reports/utils/filename.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/reports/reportFilename.test.ts
import { describe, expect, it } from "vitest";
import { reportFilename } from "@/modules/reports/utils/filename";

describe("reportFilename", () => {
  it("formats cartola filename", () => {
    const name = reportFilename("cartola");
    expect(name).toMatch(/^reporte-cartola-clientes-\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it("formats pending-invoices filename", () => {
    expect(reportFilename("pending-invoices")).toMatch(
      /^reporte-facturas-pendientes-\d{4}-\d{2}-\d{2}\.pdf$/
    );
  });

  it("formats sales filename", () => {
    expect(reportFilename("sales")).toMatch(/^reporte-ventas-\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it("formats payments filename", () => {
    expect(reportFilename("payments")).toMatch(/^reporte-pagos-\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  it("formats credit-notes filename", () => {
    expect(reportFilename("credit-notes")).toMatch(
      /^reporte-notas-credito-\d{4}-\d{2}-\d{2}\.pdf$/
    );
  });

  it("formats balances filename", () => {
    expect(reportFilename("balances")).toMatch(/^reporte-saldos-\d{4}-\d{2}-\d{2}\.pdf$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/reports/reportFilename.test.ts`
Expected: FAIL with "Cannot find module '@/modules/reports/utils/filename'".

- [ ] **Step 3: Implement `reportFilename`**

```ts
// src/modules/reports/utils/filename.ts
import type { ReportType } from "../types/report";

const TAB_SLUGS: Record<ReportType, string> = {
  cartola: "cartola-clientes",
  "pending-invoices": "facturas-pendientes",
  sales: "ventas",
  payments: "pagos",
  "credit-notes": "notas-credito",
  balances: "saldos",
};

export function reportFilename(type: ReportType): string {
  const slug = TAB_SLUGS[type];
  const date = new Date().toISOString().slice(0, 10);
  return `reporte-${slug}-${date}.pdf`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/reports/reportFilename.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git -C /Users/francisco/Desktop/metalu/ add tests/reports/reportFilename.test.ts src/modules/reports/utils/filename.ts
git -C /Users/francisco/Desktop/metalu/ commit -m "feat(reports): add reportFilename helper"
```

---

## Task 5: Shared `PdfTable` component

**Files:**
- Create: `src/modules/reports/pdf/PdfTable.tsx`

- [ ] **Step 1: Create `PdfTable.tsx`**

```tsx
// src/modules/reports/pdf/PdfTable.tsx
import { View, Text, StyleSheet } from "@react-pdf/renderer";

export type PdfColumn<T> = {
  header: string;
  accessor?: keyof T;
  render?: (row: T) => string;
  width: string; // CSS width, e.g. "12%"
  align?: "left" | "right" | "center";
};

type Props<T> = {
  columns: PdfColumn<T>[];
  rows: T[];
};

const styles = StyleSheet.create({
  table: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#111",
    marginTop: 4,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#e8e8e8",
    borderBottomWidth: 1,
    borderColor: "#111",
  },
  headerCell: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 10,
    fontWeight: 700,
    borderRightWidth: 1,
    borderColor: "#111",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#111",
    minHeight: 16,
  },
  cell: {
    paddingVertical: 3,
    paddingHorizontal: 4,
    fontSize: 10,
    borderRightWidth: 1,
    borderColor: "#111",
  },
  cellLast: {
    borderRightWidth: 0,
  },
});

export function PdfTable<T>({ columns, rows }: Props<T>) {
  function renderCell(row: T, col: PdfColumn<T>) {
    const value = col.render
      ? col.render(row)
      : col.accessor
        ? String((row as any)[col.accessor] ?? "")
        : "";
    return (
      <Text
        key={`${col.header}-${value}`}
        style={[
          styles.cell,
          { width: col.width, textAlign: col.align ?? "left" },
        ]}
      >
        {value}
      </Text>
    );
  }

  if (rows.length === 0) {
    return (
      <View style={styles.table}>
        <View style={styles.headerRow}>
          {columns.map((c, i) => (
            <Text
              key={c.header}
              style={[
                styles.headerCell,
                { width: c.width, textAlign: c.align ?? "left" },
                i === columns.length - 1 ? styles.cellLast : {},
              ]}
            >
              {c.header}
            </Text>
          ))}
        </View>
        <View style={styles.row}>
          <Text style={[styles.cell, { width: "100%", textAlign: "center" }]}>
            Sin resultados para los filtros aplicados
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.table}>
      <View style={styles.headerRow}>
        {columns.map((c, i) => (
          <Text
            key={c.header}
            style={[
              styles.headerCell,
              { width: c.width, textAlign: c.align ?? "left" },
              i === columns.length - 1 ? styles.cellLast : {},
            ]}
          >
            {c.header}
          </Text>
        ))}
      </View>
      {rows.map((row, idx) => (
        <View key={idx} style={styles.row}>
          {columns.map((c, i) => (
            <View key={c.header} style={{ width: c.width }}>
              {renderCell(row, c)}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
```

Note: the `View` wrapping each cell is required because `@react-pdf/renderer` doesn't honor percentage `width` on `<Text>` directly inside flex rows — it needs the wrapping view. This is a known react-pdf quirk.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git -C /Users/francisco/Desktop/metalu/ add src/modules/reports/pdf/PdfTable.tsx
git -C /Users/francisco/Desktop/metalu/ commit -m "feat(reports): add shared PdfTable component"
```

---

## Task 6: `CartolaSection` and `BalancesSection`

**Files:**
- Create: `src/modules/reports/pdf/sections/CartolaSection.tsx`
- Create: `src/modules/reports/pdf/sections/BalancesSection.tsx`

These two are grouped because cartola has the most columns (7) and balances has the simplest shape (one row per client). Visual smoke happens in Task 11 (full PDF route).

- [ ] **Step 1: Create `CartolaSection.tsx`**

```tsx
// src/modules/reports/pdf/sections/CartolaSection.tsx
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PdfTable, type PdfColumn } from "../PdfTable";
import { formatCLP, formatDate } from "../../utils/formatters";
import type { CartolaRow } from "../../types/report";

const styles = StyleSheet.create({
  totals: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 24,
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: "#f5f5f5",
    borderTopWidth: 1,
    borderColor: "#111",
  },
  totalsItem: { fontSize: 10 },
  totalsLabel: { color: "#555" },
  totalsValue: { fontWeight: 700 },
});

type Props = {
  rows: CartolaRow[];
  totals?: { cargos: number; abonos: number; saldoFinal: number };
};

const columns: PdfColumn<CartolaRow>[] = [
  { header: "Fecha", render: (r) => formatDate(r.date), width: "12%" },
  { header: "Tipo", accessor: "type", width: "12%" },
  { header: "N° Doc", accessor: "documentNumber", width: "14%" },
  { header: "Detalle", accessor: "detail", width: "30%" },
  {
    header: "Cargo",
    render: (r) => (r.charge ? formatCLP(r.charge) : "—"),
    width: "10%",
    align: "right",
  },
  {
    header: "Abono",
    render: (r) => (r.payment ? formatCLP(r.payment) : "—"),
    width: "10%",
    align: "right",
  },
  {
    header: "Saldo",
    render: (r) => formatCLP(r.balance),
    width: "12%",
    align: "right",
  },
];

export function CartolaSection({ rows, totals }: Props) {
  return (
    <View>
      <PdfTable columns={columns} rows={rows} />
      {totals && rows.length > 0 && (
        <View style={styles.totals}>
          <Text style={styles.totalsItem}>
            <Text style={styles.totalsLabel}>Σ Cargos: </Text>
            <Text style={styles.totalsValue}>{formatCLP(totals.cargos)}</Text>
          </Text>
          <Text style={styles.totalsItem}>
            <Text style={styles.totalsLabel}>Σ Abonos: </Text>
            <Text style={styles.totalsValue}>{formatCLP(totals.abonos)}</Text>
          </Text>
          <Text style={styles.totalsItem}>
            <Text style={styles.totalsLabel}>Saldo Final: </Text>
            <Text style={styles.totalsValue}>{formatCLP(totals.saldoFinal)}</Text>
          </Text>
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 2: Create `BalancesSection.tsx`**

```tsx
// src/modules/reports/pdf/sections/BalancesSection.tsx
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PdfTable, type PdfColumn } from "../PdfTable";
import { formatCLP } from "../../utils/formatters";
import type { BalanceRow } from "../../types/report";

const styles = StyleSheet.create({
  totals: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: "#f5f5f5",
    borderTopWidth: 1,
    borderColor: "#111",
  },
  totalsLabel: { color: "#555", fontSize: 10 },
  totalsValue: { fontWeight: 700, fontSize: 10 },
});

type Props = {
  rows: BalanceRow[];
  totals?: { saldoActual: number };
};

const columns: PdfColumn<BalanceRow>[] = [
  { header: "Código", accessor: "clientCode", width: "14%" },
  { header: "Cliente", accessor: "clientName", width: "30%" },
  {
    header: "Facturado",
    render: (r) => formatCLP(r.totalFacturado),
    width: "14%",
    align: "right",
  },
  {
    header: "Pagado",
    render: (r) => formatCLP(r.totalPagado),
    width: "14%",
    align: "right",
  },
  {
    header: "Notas Crédito",
    render: (r) => formatCLP(r.totalNotasCredito),
    width: "14%",
    align: "right",
  },
  {
    header: "Saldo Actual",
    render: (r) => formatCLP(r.saldoActual),
    width: "14%",
    align: "right",
  },
];

export function BalancesSection({ rows, totals }: Props) {
  return (
    <View>
      <PdfTable columns={columns} rows={rows} />
      {totals && rows.length > 0 && (
        <View style={styles.totals}>
          <Text>
            <Text style={styles.totalsLabel}>Σ Saldo Actual: </Text>
            <Text style={styles.totalsValue}>{formatCLP(totals.saldoActual)}</Text>
          </Text>
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git -C /Users/francisco/Desktop/metalu/ add src/modules/reports/pdf/sections/CartolaSection.tsx src/modules/reports/pdf/sections/BalancesSection.tsx
git -C /Users/francisco/Desktop/metalu/ commit -m "feat(reports): add Cartola and Balances PDF sections"
```

---

## Task 7: `PendingInvoicesSection`, `SalesSection`, `PaymentsSection`, `CreditNotesSection`

**Files:**
- Create: `src/modules/reports/pdf/sections/PendingInvoicesSection.tsx`
- Create: `src/modules/reports/pdf/sections/SalesSection.tsx`
- Create: `src/modules/reports/pdf/sections/PaymentsSection.tsx`
- Create: `src/modules/reports/pdf/sections/CreditNotesSection.tsx`

- [ ] **Step 1: Create `PendingInvoicesSection.tsx`**

```tsx
// src/modules/reports/pdf/sections/PendingInvoicesSection.tsx
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PdfTable, type PdfColumn } from "../PdfTable";
import { formatCLP, formatDate } from "../../utils/formatters";
import type { PendingInvoiceRow } from "../../types/report";

const styles = StyleSheet.create({
  totals: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: "#f5f5f5",
    borderTopWidth: 1,
    borderColor: "#111",
  },
  totalsLabel: { color: "#555", fontSize: 10 },
  totalsValue: { fontWeight: 700, fontSize: 10 },
});

type Props = {
  rows: PendingInvoiceRow[];
  totals?: { saldo: number };
};

const columns: PdfColumn<PendingInvoiceRow>[] = [
  {
    header: "Emisión",
    render: (r) => formatDate(r.issueDate),
    width: "12%",
  },
  { header: "Vencimiento", render: (r) => formatDate(r.dueDate), width: "12%" },
  { header: "N°", accessor: "number", width: "12%" },
  { header: "Cliente", accessor: "clientName", width: "26%" },
  {
    header: "Total",
    render: (r) => formatCLP(r.total),
    width: "12%",
    align: "right",
  },
  {
    header: "Saldo",
    render: (r) => formatCLP(r.saldo),
    width: "12%",
    align: "right",
  },
  {
    header: "Días atraso",
    render: (r) => (r.daysOverdue == null ? "—" : String(r.daysOverdue)),
    width: "14%",
    align: "right",
  },
];

export function PendingInvoicesSection({ rows, totals }: Props) {
  return (
    <View>
      <PdfTable columns={columns} rows={rows} />
      {totals && rows.length > 0 && (
        <View style={styles.totals}>
          <Text>
            <Text style={styles.totalsLabel}>Σ Saldo: </Text>
            <Text style={styles.totalsValue}>{formatCLP(totals.saldo)}</Text>
          </Text>
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 2: Create `SalesSection.tsx`**

```tsx
// src/modules/reports/pdf/sections/SalesSection.tsx
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PdfTable, type PdfColumn } from "../PdfTable";
import { formatCLP, formatDate } from "../../utils/formatters";
import type { SaleRow } from "../../types/report";

const styles = StyleSheet.create({
  totals: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 20,
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: "#f5f5f5",
    borderTopWidth: 1,
    borderColor: "#111",
  },
  totalsLabel: { color: "#555", fontSize: 10 },
  totalsValue: { fontWeight: 700, fontSize: 10 },
});

type Props = {
  rows: SaleRow[];
  totals?: { neto: number; iva: number; total: number };
};

const columns: PdfColumn<SaleRow>[] = [
  { header: "Fecha", render: (r) => formatDate(r.issueDate), width: "12%" },
  { header: "N°", accessor: "number", width: "12%" },
  { header: "Cliente", accessor: "clientName", width: "32%" },
  {
    header: "Neto",
    render: (r) => formatCLP(r.neto),
    width: "14%",
    align: "right",
  },
  {
    header: "IVA",
    render: (r) => formatCLP(r.iva),
    width: "14%",
    align: "right",
  },
  {
    header: "Total",
    render: (r) => formatCLP(r.total),
    width: "16%",
    align: "right",
  },
];

export function SalesSection({ rows, totals }: Props) {
  return (
    <View>
      <PdfTable columns={columns} rows={rows} />
      {totals && rows.length > 0 && (
        <View style={styles.totals}>
          <Text>
            <Text style={styles.totalsLabel}>Σ Neto: </Text>
            <Text style={styles.totalsValue}>{formatCLP(totals.neto)}</Text>
          </Text>
          <Text>
            <Text style={styles.totalsLabel}>Σ IVA: </Text>
            <Text style={styles.totalsValue}>{formatCLP(totals.iva)}</Text>
          </Text>
          <Text>
            <Text style={styles.totalsLabel}>Σ Total: </Text>
            <Text style={styles.totalsValue}>{formatCLP(totals.total)}</Text>
          </Text>
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 3: Create `PaymentsSection.tsx`**

```tsx
// src/modules/reports/pdf/sections/PaymentsSection.tsx
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PdfTable, type PdfColumn } from "../PdfTable";
import { formatCLP, formatDate } from "../../utils/formatters";
import type { PaymentRow } from "../../types/report";

const styles = StyleSheet.create({
  totals: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: "#f5f5f5",
    borderTopWidth: 1,
    borderColor: "#111",
  },
  totalsLabel: { color: "#555", fontSize: 10 },
  totalsValue: { fontWeight: 700, fontSize: 10 },
});

type Props = {
  rows: PaymentRow[];
  totals?: { monto: number };
};

const columns: PdfColumn<PaymentRow>[] = [
  { header: "Fecha", render: (r) => formatDate(r.date), width: "12%" },
  { header: "N°", accessor: "number", width: "12%" },
  {
    header: "Cliente",
    render: (r) => r.clientName ?? "—",
    width: "32%",
  },
  { header: "Método", accessor: "method", width: "16%" },
  {
    header: "Monto",
    render: (r) => formatCLP(r.amount),
    width: "14%",
    align: "right",
  },
  { header: "Estado", accessor: "status", width: "14%" },
];

export function PaymentsSection({ rows, totals }: Props) {
  return (
    <View>
      <PdfTable columns={columns} rows={rows} />
      {totals && rows.length > 0 && (
        <View style={styles.totals}>
          <Text>
            <Text style={styles.totalsLabel}>Σ Monto: </Text>
            <Text style={styles.totalsValue}>{formatCLP(totals.monto)}</Text>
          </Text>
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 4: Create `CreditNotesSection.tsx`**

```tsx
// src/modules/reports/pdf/sections/CreditNotesSection.tsx
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PdfTable, type PdfColumn } from "../PdfTable";
import { formatCLP, formatDate } from "../../utils/formatters";
import type { CreditNoteRow } from "../../types/report";

const styles = StyleSheet.create({
  totals: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: "#f5f5f5",
    borderTopWidth: 1,
    borderColor: "#111",
  },
  totalsLabel: { color: "#555", fontSize: 10 },
  totalsValue: { fontWeight: 700, fontSize: 10 },
});

type Props = {
  rows: CreditNoteRow[];
  totals?: { total: number };
};

const columns: PdfColumn<CreditNoteRow>[] = [
  {
    header: "Fecha",
    render: (r) => formatDate(r.issueDate),
    width: "14%",
  },
  { header: "N°", accessor: "number", width: "16%" },
  { header: "Cliente", accessor: "clientName", width: "42%" },
  {
    header: "Total",
    render: (r) => formatCLP(r.total),
    width: "28%",
    align: "right",
  },
];

export function CreditNotesSection({ rows, totals }: Props) {
  return (
    <View>
      <PdfTable columns={columns} rows={rows} />
      {totals && rows.length > 0 && (
        <View style={styles.totals}>
          <Text>
            <Text style={styles.totalsLabel}>Σ Total: </Text>
            <Text style={styles.totalsValue}>{formatCLP(totals.total)}</Text>
          </Text>
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git -C /Users/francisco/Desktop/metalu/ add src/modules/reports/pdf/sections/
git -C /Users/francisco/Desktop/metalu/ commit -m "feat(reports): add PendingInvoices, Sales, Payments, CreditNotes PDF sections"
```

---

## Task 8: `ReportsPdf` dispatcher component

**Files:**
- Create: `src/modules/reports/pdf/ReportsPdf.tsx`

- [ ] **Step 1: Create `ReportsPdf.tsx`**

```tsx
// src/modules/reports/pdf/ReportsPdf.tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { registerPdfFonts, PDF_FONT_FAMILY } from "@/lib/pdf/fonts";
import { CartolaSection } from "./sections/CartolaSection";
import { PendingInvoicesSection } from "./sections/PendingInvoicesSection";
import { SalesSection } from "./sections/SalesSection";
import { PaymentsSection } from "./sections/PaymentsSection";
import { CreditNotesSection } from "./sections/CreditNotesSection";
import { BalancesSection } from "./sections/BalancesSection";
import { formatDate } from "../utils/formatters";
import type {
  CartolaRow,
  PendingInvoiceRow,
  SaleRow,
  PaymentRow,
  CreditNoteRow,
  BalanceRow,
  ReportType,
} from "../types/report";

registerPdfFonts();

const TAB_LABELS: Record<ReportType, string> = {
  cartola: "Cartola Clientes",
  "pending-invoices": "Facturas Pendientes",
  sales: "Ventas",
  payments: "Pagos",
  "credit-notes": "Notas Crédito",
  balances: "Saldos",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 50,
    paddingHorizontal: 40,
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 10,
    color: "#111",
  },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 8 },
  filtersBox: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#111",
    paddingVertical: 8,
    marginBottom: 12,
  },
  filtersTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 4,
  },
  filterLine: { fontSize: 10, marginBottom: 2 },
  filterLabel: { color: "#555", marginRight: 4 },
  pageNumber: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 9,
    color: "#555",
  },
});

type Props = {
  type: ReportType;
  filters: { clientId?: string; from?: string; to?: string };
  rows: unknown[];
  totals?: Record<string, number>;
  clientName: string | null;
};

export function ReportsPdf({ type, filters, rows, totals, clientName }: Props) {
  return (
    <Document
      title={`Reporte ${TAB_LABELS[type]}`}
      author="Metalu"
      subject={TAB_LABELS[type]}
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Reporte: {TAB_LABELS[type]}</Text>

        <View style={styles.filtersBox}>
          <Text style={styles.filtersTitle}>Filtros aplicados:</Text>
          {filters.clientId && (
            <Text style={styles.filterLine}>
              <Text style={styles.filterLabel}>Cliente:</Text>
              {clientName ?? filters.clientId}
            </Text>
          )}
          {filters.from && (
            <Text style={styles.filterLine}>
              <Text style={styles.filterLabel}>Desde:</Text>
              {formatDate(filters.from)}
            </Text>
          )}
          {filters.to && (
            <Text style={styles.filterLine}>
              <Text style={styles.filterLabel}>Hasta:</Text>
              {formatDate(filters.to)}
            </Text>
          )}
          {!filters.clientId && !filters.from && !filters.to && (
            <Text style={styles.filterLine}>Sin filtros</Text>
          )}
        </View>

        {renderSection(type, rows, totals)}

        <Text
          style={styles.pageNumber}
          fixed
          render={({ pageNumber, totalPages }) =>
            totalPages > 1 ? `Página ${pageNumber} de ${totalPages}` : null
          }
        />
      </Page>
    </Document>
  );
}

function renderSection(
  type: ReportType,
  rows: unknown[],
  totals?: Record<string, number>
) {
  switch (type) {
    case "cartola":
      return (
        <CartolaSection
          rows={rows as CartolaRow[]}
          totals={totals as any}
        />
      );
    case "pending-invoices":
      return (
        <PendingInvoicesSection
          rows={rows as PendingInvoiceRow[]}
          totals={totals as any}
        />
      );
    case "sales":
      return (
        <SalesSection rows={rows as SaleRow[]} totals={totals as any} />
      );
    case "payments":
      return (
        <PaymentsSection
          rows={rows as PaymentRow[]}
          totals={totals as any}
        />
      );
    case "credit-notes":
      return (
        <CreditNotesSection
          rows={rows as CreditNoteRow[]}
          totals={totals as any}
        />
      );
    case "balances":
      return (
        <BalancesSection
          rows={rows as BalanceRow[]}
          totals={totals as any}
        />
      );
  }
}

export default ReportsPdf;
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git -C /Users/francisco/Desktop/metalu/ add src/modules/reports/pdf/ReportsPdf.tsx
git -C /Users/francisco/Desktop/metalu/ commit -m "feat(reports): add ReportsPdf dispatcher component"
```

---

## Task 9: `/api/reports/pdf` route

**Files:**
- Create: `src/app/api/reports/pdf/route.ts`

- [ ] **Step 1: Create the route**

```ts
// src/app/api/reports/pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createElement } from "react";
import { auth } from "@/lib/auth/auth";
import { pdf } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma/prisma";
import { ReportFiltersSchema } from "@/modules/reports/validations/reportSchemas";
import { runReport } from "@/modules/reports/services/reportService";
import { ReportsPdf } from "@/modules/reports/pdf/ReportsPdf";
import { reportFilename } from "@/modules/reports/utils/filename";
import type { ReportType } from "@/modules/reports/types/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES: ReportType[] = [
  "cartola",
  "pending-invoices",
  "sales",
  "payments",
  "credit-notes",
  "balances",
];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const raw = {
    type: searchParams.get("type") ?? undefined,
    clientId: searchParams.get("clientId") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  };

  const parsed = ReportFiltersSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const { type, clientId, from, to } = parsed.data;
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: "Tipo de reporte inválido" },
      { status: 400 }
    );
  }

  let clientName: string | null = null;
  if (clientId) {
    const c = await prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true },
    });
    clientName = c?.name ?? null;
  }

  try {
    const { rows, totals } = await runReport(type, { clientId, from, to });
    console.log(
      `[pdf/reports] type=${type} clientId=${clientId ?? "—"} rows=${rows.length}`
    );

    const buffer = await pdf(
      createElement(ReportsPdf, {
        type,
        filters: { clientId, from, to },
        rows,
        totals,
        clientName,
      })
    ).toBuffer();

    const filename = reportFilename(type);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    if (/requiere|inválido/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[pdf/reports] error:", error);
    return NextResponse.json(
      { error: "Error al generar el PDF" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Manual smoke test**

1. Restart dev server.
2. While logged in, hit `http://localhost:3000/api/reports/pdf?type=balances` in browser — should download `reporte-saldos-YYYY-MM-DD.pdf`.
3. Open the PDF. Verify: title "Reporte: Saldos", filters box, table with all clients, totals at bottom.
4. Repeat for `?type=pending-invoices`, `?type=credit-notes`, `?type=sales`, `?type=payments`.
5. Test cartola: `?type=cartola&clientId=<some-real-id>`. Use Network tab → fetch client list from `/api/clients` to get an id, or run `rg "findUnique" /Users/francisco/Desktop/metalu/src/app/api/clients/` to find an existing endpoint.
6. Test cartola without clientId: `?type=cartola` → expect 400 JSON `{ error: "cartola requiere clientId" }`.
7. Test invalid type: `?type=foo` → expect 400 JSON.
8. Verify server log shows `[pdf/reports] type=... clientId=... rows=...`.

- [ ] **Step 3: Commit**

```bash
git -C /Users/francisco/Desktop/metalu/ add src/app/api/reports/pdf/route.ts
git -C /Users/francisco/Desktop/metalu/ commit -m "feat(reports): add GET /api/reports/pdf endpoint"
```

---

## Task 10: Wire "Exportar PDF" button into `/reports/ReportsView`

**Files:**
- Modify: `src/modules/reports/components/ReportsView.tsx`

- [ ] **Step 1: Add the button + handler**

Read the current `src/modules/reports/components/ReportsView.tsx`. Then make these edits:

**Add imports** at the top (after the existing third-party imports):

```tsx
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { reportFilename } from "../utils/filename";
```

**Add state** inside the component, after `const [loading, setLoading] = useState(false);`:

```tsx
const [exporting, setExporting] = useState(false);
```

**Add `canExport` derivation** after the existing `const canFetch = ...`:

```tsx
const canExport =
  !loading && !error && rows.length > 0 && (activeTab !== "cartola" || !!clientId);
```

**Add `handleExportPdf`** after `handleClientChange`:

```tsx
async function handleExportPdf() {
  if (!canExport || exporting) return;
  setExporting(true);
  try {
    const params = new URLSearchParams({ type: activeTab });
    if (clientId) params.set("clientId", clientId);
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(to).toISOString());

    const res = await fetch(`/api/reports/pdf?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error ${res.status}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = reportFilename(activeTab);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e: any) {
    alert(e.message ?? "Error al generar el PDF");
  } finally {
    setExporting(false);
  }
}
```

**Add the button** inside the existing `<Tabs>` component, immediately after `</ReportFilters>` closing div and before the `{error && ...}` block. The structure is:

```tsx
<ReportFilters ... />

<Button ... />   ← INSERT HERE

{error && (...)}
```

Add:

```tsx
<div className="mt-4 flex justify-end">
  <Button
    type="button"
    onClick={handleExportPdf}
    disabled={!canExport || exporting}
    title={
      canExport
        ? "Descargar PDF"
        : rows.length === 0
          ? "No hay datos para exportar"
          : activeTab === "cartola" && !clientId
            ? "Seleccioná un cliente para exportar"
            : "Cargando..."
    }
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

Note: this section is for `/reports/ReportsView.tsx`, so the `<ReportFilters>` block ends with the closing tag — confirm visually that the button sits at the right of the filter row.

- [ ] **Step 2: Type-check + manual smoke**

1. Run: `npx tsc --noEmit -p tsconfig.json`. Expected: 0 errors.
2. Restart dev server if not running.
3. Open `/reports` in browser.
4. Click "Cartola Clientes" tab — button should be disabled with tooltip "Seleccioná un cliente para exportar".
5. Pick a client in the filter — table populates → button enables.
6. Click "Exportar PDF" → file downloads with the right filename.
7. Switch to "Saldos" tab — no required filter, button enables as soon as rows populate.
8. Switch to "Facturas Pendientes" — apply date range → button enables → click → file downloads.

- [ ] **Step 3: Commit**

```bash
git -C /Users/francisco/Desktop/metalu/ add src/modules/reports/components/ReportsView.tsx
git -C /Users/francisco/Desktop/metalu/ commit -m "feat(reports): add Exportar PDF button to /reports/ReportsView"
```

---

## Task 11: Manual smoke test for `/reports` PDF

This task is a final visual + functional verification for `/reports`. No code changes.

- [ ] **Step 1: Open `/reports` in browser**

1. Login → navigate to `/reports`.
2. Click each tab in order: Cartola, Facturas Pendientes, Ventas, Pagos, Notas Crédito, Saldos.
3. For each tab: apply a representative filter (pick a client for cartola, set a wide date range for the temporal tabs), wait for rows, click Exportar PDF, verify download.
4. Open each downloaded PDF in a viewer (Preview on macOS, browser built-in, etc.) and verify:
   - Title: "Reporte: {TAB_LABEL}".
   - Filters applied block: cliente + fechas when present.
   - Table renders with correct columns and at least one row.
   - Totals block at the bottom when applicable.
   - Page numbers only appear if the table spans multiple pages.

- [ ] **Step 2: Edge cases**

1. Cartola without client → button stays disabled.
2. Date range that returns 0 rows → button disabled (no PDF generated).
3. Only `from` set, no `to` → PDF shows partial range.
4. Open a downloaded PDF and search for the client name in the filters block — should match what was on screen.

- [ ] **Step 3: Document result**

Note any visual issues (alignment, overflow, totals formatting) for fixing in a follow-up commit if needed. If everything looks correct, no commit required for this task.

---

## Task 12: `supplierReportFilename` helper — tests + implementation

**Files:**
- Create: `tests/supplier-reports/reportFilename.test.ts`
- Create: `src/modules/suppliers-reports/utils/filename.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/supplier-reports/reportFilename.test.ts
import { describe, expect, it } from "vitest";
import { supplierReportFilename } from "@/modules/suppliers-reports/utils/filename";

describe("supplierReportFilename", () => {
  it("formats by-due-date filename", () => {
    expect(supplierReportFilename("by-due-date")).toMatch(
      /^reporte-por-pagar-x-fecha-\d{4}-\d{2}-\d{2}\.pdf$/
    );
  });

  it("formats by-supplier filename", () => {
    expect(supplierReportFilename("by-supplier")).toMatch(
      /^reporte-por-pagar-x-proveedor-\d{4}-\d{2}-\d{2}\.pdf$/
    );
  });

  it("formats daily-summary filename", () => {
    expect(supplierReportFilename("daily-summary")).toMatch(
      /^reporte-resumen-x-dia-\d{4}-\d{2}-\d{2}\.pdf$/
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/supplier-reports/reportFilename.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement `supplierReportFilename`**

```ts
// src/modules/suppliers-reports/utils/filename.ts
import type { SupplierReportType } from "../types/report";

const SLUGS: Record<SupplierReportType, string> = {
  "by-due-date": "por-pagar-x-fecha",
  "by-supplier": "por-pagar-x-proveedor",
  "daily-summary": "resumen-x-dia",
};

export function supplierReportFilename(type: SupplierReportType): string {
  const slug = SLUGS[type];
  const date = new Date().toISOString().slice(0, 10);
  return `reporte-${slug}-${date}.pdf`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/supplier-reports/reportFilename.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git -C /Users/francisco/Desktop/metalu/ add tests/supplier-reports/reportFilename.test.ts src/modules/suppliers-reports/utils/filename.ts
git -C /Users/francisco/Desktop/metalu/ commit -m "feat(suppliers-reports): add supplierReportFilename helper"
```

---

## Task 13: `ByDueDateSection`, `BySupplierSection`, `DailySummarySection`

**Files:**
- Create: `src/modules/suppliers-reports/pdf/sections/ByDueDateSection.tsx`
- Create: `src/modules/suppliers-reports/pdf/sections/BySupplierSection.tsx`
- Create: `src/modules/suppliers-reports/pdf/sections/DailySummarySection.tsx`

- [ ] **Step 1: Create `ByDueDateSection.tsx`**

```tsx
// src/modules/suppliers-reports/pdf/sections/ByDueDateSection.tsx
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PdfTable, type PdfColumn } from "@/modules/reports/pdf/PdfTable";
import { formatCLP, formatDate } from "@/modules/reports/utils/formatters";
import {
  SUPPLIER_DOCUMENT_TYPE_LABELS,
} from "@/modules/suppliers/types/supplierDocument";
import type { SupplierDocByDueDateRow } from "../../types/report";

const styles = StyleSheet.create({
  totals: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: "#f5f5f5",
    borderTopWidth: 1,
    borderColor: "#111",
  },
  totalsLabel: { color: "#555", fontSize: 10 },
  totalsValue: { fontWeight: 700, fontSize: 10 },
});

type Props = {
  rows: SupplierDocByDueDateRow[];
  totals?: { total: number };
};

const columns: PdfColumn<SupplierDocByDueDateRow>[] = [
  {
    header: "Vencimiento",
    render: (r) => formatDate(r.fechaVencimiento),
    width: "12%",
  },
  {
    header: "Proveedor",
    render: (r) => `${r.supplierCode} · ${r.supplierName}`,
    width: "26%",
  },
  {
    header: "Tipo",
    render: (r) => SUPPLIER_DOCUMENT_TYPE_LABELS[r.tipoDocumento] ?? r.tipoDocumento,
    width: "12%",
  },
  { header: "Nombre", accessor: "nombre", width: "20%" },
  { header: "N° Doc", accessor: "documento", width: "14%" },
  {
    header: "Valor",
    render: (r) => formatCLP(r.valor),
    width: "16%",
    align: "right",
  },
];

export function ByDueDateSection({ rows, totals }: Props) {
  return (
    <View>
      <PdfTable columns={columns} rows={rows} />
      {totals && rows.length > 0 && (
        <View style={styles.totals}>
          <Text>
            <Text style={styles.totalsLabel}>Σ Valor: </Text>
            <Text style={styles.totalsValue}>{formatCLP(totals.total)}</Text>
          </Text>
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 2: Create `BySupplierSection.tsx`**

```tsx
// src/modules/suppliers-reports/pdf/sections/BySupplierSection.tsx
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PdfTable, type PdfColumn } from "@/modules/reports/pdf/PdfTable";
import { formatCLP, formatDate } from "@/modules/reports/utils/formatters";
import {
  SUPPLIER_DOCUMENT_TYPE_LABELS,
} from "@/modules/suppliers/types/supplierDocument";
import type { SupplierDocBySupplierRow } from "../../types/report";

const styles = StyleSheet.create({
  totals: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 20,
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: "#f5f5f5",
    borderTopWidth: 1,
    borderColor: "#111",
  },
  totalsLabel: { color: "#555", fontSize: 10 },
  totalsValue: { fontWeight: 700, fontSize: 10 },
});

type Props = {
  rows: SupplierDocBySupplierRow[];
  totals?: { total: number; count: number };
};

const columns: PdfColumn<SupplierDocBySupplierRow>[] = [
  {
    header: "Proveedor",
    render: (r) => `${r.supplierCode} · ${r.supplierName}`,
    width: "26%",
  },
  {
    header: "Vencimiento",
    render: (r) => formatDate(r.fechaVencimiento),
    width: "12%",
  },
  {
    header: "Tipo",
    render: (r) => SUPPLIER_DOCUMENT_TYPE_LABELS[r.tipoDocumento] ?? r.tipoDocumento,
    width: "12%",
  },
  { header: "N° Doc", accessor: "documento", width: "14%" },
  {
    header: "Valor",
    render: (r) => formatCLP(r.valor),
    width: "16%",
    align: "right",
  },
  {
    header: "Saldo",
    render: (r) => formatCLP(r.valor),
    width: "20%",
    align: "right",
  },
];

export function BySupplierSection({ rows, totals }: Props) {
  return (
    <View>
      <PdfTable columns={columns} rows={rows} />
      {totals && rows.length > 0 && (
        <View style={styles.totals}>
          <Text>
            <Text style={styles.totalsLabel}>Σ Documentos: </Text>
            <Text style={styles.totalsValue}>{totals.count}</Text>
          </Text>
          <Text>
            <Text style={styles.totalsLabel}>Σ Valor: </Text>
            <Text style={styles.totalsValue}>{formatCLP(totals.total)}</Text>
          </Text>
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 3: Create `DailySummarySection.tsx`**

```tsx
// src/modules/suppliers-reports/pdf/sections/DailySummarySection.tsx
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PdfTable, type PdfColumn } from "@/modules/reports/pdf/PdfTable";
import { formatCLP, formatDate } from "@/modules/reports/utils/formatters";
import type { DailySummaryRow } from "../../types/report";

const styles = StyleSheet.create({
  totals: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 18,
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: "#f5f5f5",
    borderTopWidth: 1,
    borderColor: "#111",
    flexWrap: "wrap",
  },
  totalsLabel: { color: "#555", fontSize: 10 },
  totalsValue: { fontWeight: 700, fontSize: 10 },
});

type Props = {
  rows: DailySummaryRow[];
  totals?: {
    pendiente: { count: number; total: number };
    pagado: { count: number; total: number };
    cancelado: { count: number; total: number };
    count: number;
    total: number;
  };
};

const columns: PdfColumn<DailySummaryRow>[] = [
  { header: "Fecha", render: (r) => formatDate(r.fecha), width: "14%" },
  {
    header: "Pendiente",
    render: (r) =>
      `${r.pendiente.count} · ${formatCLP(r.pendiente.total)}`,
    width: "22%",
    align: "right",
  },
  {
    header: "Pagado",
    render: (r) => `${r.pagado.count} · ${formatCLP(r.pagado.total)}`,
    width: "22%",
    align: "right",
  },
  {
    header: "Cancelado",
    render: (r) =>
      `${r.cancelado.count} · ${formatCLP(r.cancelado.total)}`,
    width: "22%",
    align: "right",
  },
  {
    header: "Total del día",
    render: (r) => formatCLP(r.totalDelDia),
    width: "20%",
    align: "right",
  },
];

export function DailySummarySection({ rows, totals }: Props) {
  return (
    <View>
      <PdfTable columns={columns} rows={rows} />
      {totals && rows.length > 0 && (
        <View style={styles.totals}>
          <Text>
            <Text style={styles.totalsLabel}>Σ Pendiente: </Text>
            <Text style={styles.totalsValue}>
              {totals.pendiente.count} · {formatCLP(totals.pendiente.total)}
            </Text>
          </Text>
          <Text>
            <Text style={styles.totalsLabel}>Σ Pagado: </Text>
            <Text style={styles.totalsValue}>
              {totals.pagado.count} · {formatCLP(totals.pagado.total)}
            </Text>
          </Text>
          <Text>
            <Text style={styles.totalsLabel}>Σ Cancelado: </Text>
            <Text style={styles.totalsValue}>
              {totals.cancelado.count} · {formatCLP(totals.cancelado.total)}
            </Text>
          </Text>
          <Text>
            <Text style={styles.totalsLabel}>Σ Total: </Text>
            <Text style={styles.totalsValue}>
              {totals.count} · {formatCLP(totals.total)}
            </Text>
          </Text>
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git -C /Users/francisco/Desktop/metalu/ add src/modules/suppliers-reports/pdf/
git -C /Users/francisco/Desktop/metalu/ commit -m "feat(suppliers-reports): add 3 PDF sections"
```

---

## Task 14: `SupplierReportsPdf` dispatcher

**Files:**
- Create: `src/modules/suppliers-reports/pdf/SupplierReportsPdf.tsx`

- [ ] **Step 1: Create `SupplierReportsPdf.tsx`**

```tsx
// src/modules/suppliers-reports/pdf/SupplierReportsPdf.tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { registerPdfFonts, PDF_FONT_FAMILY } from "@/lib/pdf/fonts";
import { ByDueDateSection } from "./sections/ByDueDateSection";
import { BySupplierSection } from "./sections/BySupplierSection";
import { DailySummarySection } from "./sections/DailySummarySection";
import { formatDate } from "@/modules/reports/utils/formatters";
import type {
  SupplierReportType,
  SupplierDocByDueDateRow,
  SupplierDocBySupplierRow,
  DailySummaryRow,
} from "../types/report";

registerPdfFonts();

const TAB_LABELS: Record<SupplierReportType, string> = {
  "by-due-date": "Por pagar x fecha",
  "by-supplier": "Por pagar x proveedor",
  "daily-summary": "Resumen x día",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 50,
    paddingHorizontal: 40,
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 10,
    color: "#111",
  },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 8 },
  filtersBox: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#111",
    paddingVertical: 8,
    marginBottom: 12,
  },
  filtersTitle: { fontSize: 11, fontWeight: 700, marginBottom: 4 },
  filterLine: { fontSize: 10, marginBottom: 2 },
  filterLabel: { color: "#555", marginRight: 4 },
  pageNumber: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 9,
    color: "#555",
  },
});

type Props = {
  type: SupplierReportType;
  filters: { supplierId?: string; from?: string; to?: string };
  rows: unknown[];
  totals?: Record<string, number>;
  supplierName: string | null;
};

export function SupplierReportsPdf({
  type,
  filters,
  rows,
  totals,
  supplierName,
}: Props) {
  return (
    <Document
      title={`Reporte ${TAB_LABELS[type]}`}
      author="Metalu"
      subject={TAB_LABELS[type]}
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Reporte: {TAB_LABELS[type]}</Text>

        <View style={styles.filtersBox}>
          <Text style={styles.filtersTitle}>Filtros aplicados:</Text>
          {filters.supplierId && (
            <Text style={styles.filterLine}>
              <Text style={styles.filterLabel}>Proveedor:</Text>
              {supplierName ?? filters.supplierId}
            </Text>
          )}
          {filters.from && (
            <Text style={styles.filterLine}>
              <Text style={styles.filterLabel}>Desde:</Text>
              {formatDate(filters.from)}
            </Text>
          )}
          {filters.to && (
            <Text style={styles.filterLine}>
              <Text style={styles.filterLabel}>Hasta:</Text>
              {formatDate(filters.to)}
            </Text>
          )}
          {!filters.supplierId && !filters.from && !filters.to && (
            <Text style={styles.filterLine}>Sin filtros</Text>
          )}
        </View>

        {renderSection(type, rows, totals)}

        <Text
          style={styles.pageNumber}
          fixed
          render={({ pageNumber, totalPages }) =>
            totalPages > 1 ? `Página ${pageNumber} de ${totalPages}` : null
          }
        />
      </Page>
    </Document>
  );
}

function renderSection(
  type: SupplierReportType,
  rows: unknown[],
  totals?: Record<string, number>
) {
  switch (type) {
    case "by-due-date":
      return (
        <ByDueDateSection
          rows={rows as SupplierDocByDueDateRow[]}
          totals={totals as any}
        />
      );
    case "by-supplier":
      return (
        <BySupplierSection
          rows={rows as SupplierDocBySupplierRow[]}
          totals={totals as any}
        />
      );
    case "daily-summary":
      return (
        <DailySummarySection
          rows={rows as DailySummaryRow[]}
          totals={totals as any}
        />
      );
  }
}

export default SupplierReportsPdf;
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git -C /Users/francisco/Desktop/metalu/ add src/modules/suppliers-reports/pdf/SupplierReportsPdf.tsx
git -C /Users/francisco/Desktop/metalu/ commit -m "feat(suppliers-reports): add SupplierReportsPdf dispatcher"
```

---

## Task 15: `/api/suppliers/reports/pdf` route

**Files:**
- Create: `src/app/api/suppliers/reports/pdf/route.ts`

- [ ] **Step 1: Create the route**

```ts
// src/app/api/suppliers/reports/pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createElement } from "react";
import { auth } from "@/lib/auth/auth";
import { pdf } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma/prisma";
import { supplierReportFiltersSchema } from "@/modules/suppliers-reports/validations/reportSchemas";
import {
  getDocumentsByDueDate,
  getDocumentsBySupplier,
  getDailySummary,
} from "@/modules/suppliers-reports/services/supplierReportService";
import { SupplierReportsPdf } from "@/modules/suppliers-reports/pdf/SupplierReportsPdf";
import { supplierReportFilename } from "@/modules/suppliers-reports/utils/filename";
import type { SupplierReportType } from "@/modules/suppliers-reports/types/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES: SupplierReportType[] = [
  "by-due-date",
  "by-supplier",
  "daily-summary",
];

export async function GET(req: NextRequest) {
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

  const { type, supplierId, from, to } = parsed.data;
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: "Tipo de reporte inválido" },
      { status: 400 }
    );
  }

  let supplierName: string | null = null;
  if (supplierId) {
    const s = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { name: true },
    });
    supplierName = s?.name ?? null;
  }

  try {
    const filters = {
      supplierId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    };

    let result: { rows: unknown[]; totals?: Record<string, number> };
    switch (type) {
      case "by-due-date":
        result = await getDocumentsByDueDate(filters);
        break;
      case "by-supplier":
        result = await getDocumentsBySupplier(filters);
        break;
      case "daily-summary":
        result = await getDailySummary(filters);
        break;
    }

    console.log(
      `[pdf/suppliers/reports] type=${type} supplierId=${supplierId ?? "—"} rows=${result.rows.length}`
    );

    const buffer = await pdf(
      createElement(SupplierReportsPdf, {
        type,
        filters: { supplierId, from, to },
        rows: result.rows,
        totals: result.totals,
        supplierName,
      })
    ).toBuffer();

    const filename = supplierReportFilename(type);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("[pdf/suppliers/reports] error:", error);
    return NextResponse.json(
      { error: "Error al generar el PDF" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Manual smoke test**

1. Restart dev server.
2. While logged in, hit `http://localhost:3000/api/suppliers/reports/pdf?type=by-due-date` in browser — should download `reporte-por-pagar-x-fecha-YYYY-MM-DD.pdf`.
3. Repeat for `?type=by-supplier`, `?type=daily-summary`.
4. Open each PDF. Verify title + filters box + table content + totals.
5. Test invalid type `?type=foo` → expect 400 JSON.
6. Test invalid date format `?from=not-a-date` → expect 400 JSON from Zod.

- [ ] **Step 3: Commit**

```bash
git -C /Users/francisco/Desktop/metalu/ add src/app/api/suppliers/reports/pdf/route.ts
git -C /Users/francisco/Desktop/metalu/ commit -m "feat(suppliers-reports): add GET /api/suppliers/reports/pdf endpoint"
```

---

## Task 16: Wire "Exportar PDF" button into `/suppliers/reports/ReportsView`

**Files:**
- Modify: `src/modules/suppliers-reports/components/ReportsView.tsx`

- [ ] **Step 1: Read the current file then apply edits**

Read `src/modules/suppliers-reports/components/ReportsView.tsx` for context (you already read it during exploration).

**Add imports** at the top (alongside existing imports):

```tsx
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { supplierReportFilename } from "../utils/filename";
```

**Add state** after `const [loading, setLoading] = useState(false);`:

```tsx
const [exporting, setExporting] = useState(false);
```

**Add `canExport`** after the existing `fetchData` definition:

```tsx
const canExport = !loading && !error && rows.length > 0;
```

(No required filter for supplier reports — supplierId is optional.)

**Add `handleExportPdf`** after `handleTabChange`:

```tsx
async function handleExportPdf() {
  if (!canExport || exporting) return;
  setExporting(true);
  try {
    const params = new URLSearchParams({ type: activeTab });
    if (supplierId) params.set("supplierId", supplierId);
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(to).toISOString());

    const res = await fetch(`/api/suppliers/reports/pdf?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error ${res.status}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = supplierReportFilename(activeTab);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e: any) {
    alert(e.message ?? "Error al generar el PDF");
  } finally {
    setExporting(false);
  }
}
```

**Add the button** inside the `<Tabs>` block, immediately after the `</SupplierReportFilters>` closing div (before the `{error && (...)}` block). Match the styling used in Task 10:

```tsx
<div className="mt-4 flex justify-end">
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

- [ ] **Step 2: Type-check + manual smoke**

1. Run: `npx tsc --noEmit -p tsconfig.json`. Expected: 0 errors.
2. Restart dev server.
3. Open `/suppliers/reports` in browser.
4. Default tab is "Por pagar x fecha" — wait for rows → click Exportar PDF → file downloads.
5. Switch to "Por pagar x proveedor" → Exportar PDF works.
6. Switch to "Resumen x día" → Exportar PDF works.
7. Apply a supplier filter → verify the filter appears in the downloaded PDF's filter block.

- [ ] **Step 3: Commit**

```bash
git -C /Users/francisco/Desktop/metalu/ add src/modules/suppliers-reports/components/ReportsView.tsx
git -C /Users/francisco/Desktop/metalu/ commit -m "feat(suppliers-reports): add Exportar PDF button to ReportsView"
```

---

## Task 17: Manual smoke test for `/suppliers/reports` PDF

This task is the final visual + functional verification for `/suppliers/reports`. No code changes.

- [ ] **Step 1: Open `/suppliers/reports` in browser**

1. Login → navigate to `/suppliers/reports`.
2. For each tab (Por pagar x fecha, Por pagar x proveedor, Resumen x día): wait for rows, click Exportar PDF, verify download.
3. Open each downloaded PDF and verify:
   - Title: "Reporte: {TAB_LABEL}".
   - Filters applied block: proveedor + fechas when present.
   - Table renders with correct columns and at least one row.
   - Totals block at the bottom when applicable.
   - Page numbers only when multi-page.

- [ ] **Step 2: Edge cases**

1. Tab with 0 rows after filtering → button disabled, no PDF.
2. Open a downloaded PDF and search for the supplier name in the filters block — should match.
3. Verify a long list (e.g. many docs for one supplier) renders multi-page correctly with page numbers.

- [ ] **Step 3: Note any visual issues**

Document any visual issues for fixing in a follow-up commit if needed.

---

## Task 18: Final review + push

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass (the new tests for `runReport`, `reportFilename`, `supplierReportFilename` + all existing tests).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 0 errors.

- [ ] **Step 3: Verify git log**

Run: `git -C /Users/francisco/Desktop/metalu/ log --oneline -20`
Expected: see ~17 new commits from this work, plus the spec commit.

- [ ] **Step 4: Push to origin**

```bash
git -C /Users/francisco/Desktop/metalu/ push origin main
```

- [ ] **Step 5: Report completion**

Tell the user both pages now export PDFs. Include the URLs they can hit to verify:
- `/reports` (each of the 6 tabs)
- `/suppliers/reports` (each of the 3 tabs)

---

## Acceptance criteria

A reviewer should be able to:

1. Open `/reports`, click any tab, apply filters, click "Exportar PDF" → download succeeds, file opens, contains the title "Reporte: {TAB}", a "Filtros aplicados" block matching what was on screen, the table with the same rows, and totals at the bottom.
2. Open `/suppliers/reports`, do the same for each of the 3 tabs.
3. Run `npm test` and see all tests pass.
4. Run `npx tsc --noEmit` and see no type errors.
5. Confirm all 17 commits + the spec commit are on `origin/main`.