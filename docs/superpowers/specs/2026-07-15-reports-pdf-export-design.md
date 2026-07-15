# Reports PDF Export — Design

**Status:** approved (user signed off on each section)
**Date:** 2026-07-15
**Author:** brainstorm session

## Context

The `/reports` page (clients reports, 6 tabs) and `/suppliers/reports` page (supplier documents, 3 tabs) currently let users filter and inspect data on screen, but offer no way to take that data out of the app. The user asked for a per-tab "Exportar PDF" button so each report can be downloaded, saved, or emailed as a standalone document.

This feature reuses the existing PDF infrastructure (`@react-pdf/renderer`, `src/lib/pdf/fonts.ts`, `src/lib/pdf/logo.ts`) and follows the same server-side render pattern already shipping for `QuotationPdf` and `WorkOrderPdf`.

## Goals

- Add a single "Exportar PDF" button per page that exports the **active tab's** current view to PDF.
- Mirror exactly what's on screen: filters applied + rows + totals.
- Reuse the existing `reportService` and `supplierReportService` — no duplicate query logic.
- Work in Tauri local mode (server-side render, PDF binary returned to WebView).

## Non-Goals

- All-tabs-in-one-PDF (rejected — too much PDF sprawl for one report run).
- Email/share integration after generation (YAGNI).
- Visual PDF editor / templates per report (YAGNI).
- PDF for non-report modules (e.g. /clients list) — out of scope.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Render location | Server-side (API route renders, returns Buffer) | Matches QuotationPdf/WorkOrderPdf pattern; Tauri local PGlite makes double-query cost negligible; URL is shareable |
| PDF scope | One PDF per active tab | Simpler UI, mirrors on-screen scope, scales with rows |
| PDF header | Minimalist (title + applied filters only) | Per user request — no logo, no company info |
| Filename | `reporte-{tab-slug}-{YYYY-MM-DD}.pdf` | Per user request — simple, sortable by date |
| Architecture | Single dispatcher component (`ReportsPdf` + `SupplierReportsPdf`) with per-tab sections | DRY for shared header/footer, isolated per-tab logic |
| Refactor | Extract `runReport(type, filters)` from `/api/reports/route.ts` into `reportService.ts` | Avoid duplicating the type→query switch in the new PDF route |

## Architecture

### New files — `/reports`

- `src/modules/reports/pdf/ReportsPdf.tsx` — `<Document>` with `<Page>` A4; renders title + applied-filters block, then `<Section>` for the active tab.
- `src/modules/reports/pdf/PdfTable.tsx` — shared `<View>` table renderer (header row, body rows, optional totals block). Columns are `{ header, accessor | render, width, align }[]`.
- `src/modules/reports/pdf/sections/CartolaSection.tsx`
- `src/modules/reports/pdf/sections/PendingInvoicesSection.tsx`
- `src/modules/reports/pdf/sections/SalesSection.tsx`
- `src/modules/reports/pdf/sections/PaymentsSection.tsx`
- `src/modules/reports/pdf/sections/CreditNotesSection.tsx`
- `src/modules/reports/pdf/sections/BalancesSection.tsx`
- `src/app/api/reports/pdf/route.ts` — `GET` handler. Auth → validate `type` + filters → call `runReport()` → resolve client name → render `<ReportsPdf>` → return Buffer.

### New files — `/suppliers/reports`

- `src/modules/suppliers-reports/pdf/SupplierReportsPdf.tsx` — same shape as `ReportsPdf` but for supplier reports.
- `src/modules/suppliers-reports/pdf/sections/ByDueDateSection.tsx`
- `src/modules/suppliers-reports/pdf/sections/BySupplierSection.tsx`
- `src/modules/suppliers-reports/pdf/sections/DailySummarySection.tsx`
- `src/app/api/suppliers/reports/pdf/route.ts` — mirrors `/api/reports/pdf`.

### Modified files

- `src/modules/reports/services/reportService.ts` — add exported `runReport(type, filters): Promise<{ rows, totals }>` that wraps the existing 6 query functions behind a `switch (type)`. The existing `/api/reports/route.ts` switch is replaced by a call to `runReport()`.
- `src/modules/reports/components/ReportsView.tsx` — add "Exportar PDF" button next to filters; wire `handleExportPdf`.
- `src/modules/suppliers-reports/components/ReportsView.tsx` — same button + handler.

### Untouched

- `pdf/fonts.ts` — fonts register automatically; no change.
- `pdf/logo.ts` — not used (header is minimalist, no logo).
- `reportSchemas.ts`, `supplierReportService.ts`, `supplierReportSchemas.ts` — unchanged.
- Existing `/api/reports/route.ts` and `/api/suppliers/reports/route.ts` — only refactor is replacing inline switch with `runReport()` call; output shape stays identical.

## PDF layout

A4 portrait, font EB Garamond (auto-registered via `registerPdfFonts()`), 40px horizontal padding.

```
┌─────────────────────────────────────────┐
│ Reporte: {TAB_LABEL}              ← H1  │
│                                         │
│ Filtros aplicados:               ← H2   │
│   {Cliente: ACME SpA}                   │
│   {Desde: 01/01/2026}                   │
│   {Hasta: 15/07/2026}                   │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Header row (gray bg)               │ │
│ ├─────────────────────────────────────┤ │
│ │ row 1                              │ │
│ │ row 2                              │ │
│ │ ...                                │ │
│ ├─────────────────────────────────────┤ │
│ │ Totals block (if totals present)   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│              Página X de Y              │ ← only if totalPages > 1
└─────────────────────────────────────────┘
```

The header (`Reporte: X` + filtros) is rendered once at the top of the document. `@react-pdf/renderer` automatically paginates overflow rows. The page number footer only appears when the document spans multiple pages.

## Component contracts

### `<ReportsPdf>`

```ts
type Props = {
  type: ReportType;
  filters: { clientId?: string; from?: string; to?: string };
  rows: unknown[];          // narrow per-section via discriminated union
  totals?: Record<string, number>;
  clientName: string | null; // resolved server-side from filters.clientId
};
```

Internal: `registerPdfFonts()` at module load (idempotent). `switch (type)` dispatches to one of 6 sections.

### `<Section>` (one per tab)

```ts
type Props<T> = { rows: T[]; totals?: Record<string, number> };
```

Each section is `<View><PdfTable .../>{totals && <TotalsBlock/>}</View>`. Pure presentational — no data fetching, no side effects.

### `<PdfTable>`

```ts
type Column<T> = {
  header: string;
  accessor?: keyof T;
  render?: (row: T) => string;
  width: string;        // CSS width e.g. "12%"
  align?: "left" | "right" | "center";
};
type Props<T> = { columns: Column<T>[]; rows: T[] };
```

Renders a `<View>` with header row (gray background, bold) and one `<View>` row per data row. Borders on top/left/right, between rows.

### `runReport(type, filters)`

```ts
// src/modules/reports/services/reportService.ts
export type ReportFilters = { clientId?: string; from?: string; to?: string };
export async function runReport(
  type: ReportType,
  filters: ReportFilters
): Promise<{ rows: unknown[]; totals?: Record<string, number> }>;
```

Internal: switch on `type` calling the existing `getCartola`, `getPendingInvoices`, etc. Throws `Error("type inválido")` on unknown `type`.

## API contracts

### `GET /api/reports/pdf`

**Query params:**
- `type` (required): `cartola` | `pending-invoices` | `sales` | `payments` | `credit-notes` | `balances`
- `clientId` (optional): string. **Required when `type=cartola`**; otherwise optional.
- `from` (optional): ISO-8601 datetime string.
- `to` (optional): ISO-8601 datetime string.

**Response:**
- 200: `application/pdf` binary. `Content-Disposition: attachment; filename="reporte-{tab-slug}-{YYYY-MM-DD}.pdf"`. `Content-Length` and `Cache-Control: no-store`.
- 400: `{ error: "..." }` (invalid type, missing required filter, malformed date).
- 401: `Unauthorized`.
- 500: `{ error: "..." }` (DB error, PDF render error).

**Handler flow:**
1. `auth()` — 401 if no session.
2. Parse + validate query params — 400 if invalid.
3. `runReport(type, filters)` — reuses existing service.
4. Resolve `clientName` from `filters.clientId` (one extra `prisma.client.findUnique` only when `clientId` is set; null otherwise).
5. `pdf(createElement(ReportsPdf, { type, filters, rows, totals, clientName })).toBuffer()`.
6. Return Buffer with proper headers.
7. `console.log("[pdf/reports] type=... clientId=... rows=...")` for Vercel logs.

### `GET /api/suppliers/reports/pdf`

Same shape, with `supplierId` replacing `clientId`. No "required" filter — supplier reports work with all suppliers.

## UI behavior

Both `ReportsView.tsx` components share the same shape but each implements its own filter logic (cartola requires `clientId`; supplier reports have no required filter). Pseudocode for `/reports/ReportsView.tsx`:

```tsx
const [exporting, setExporting] = useState(false);

const canExport =
  !loading &&
  !error &&
  rows.length > 0 &&
  (activeTab !== "cartola" || !!clientId);  // cartola requires client

async function handleExportPdf() {
  if (!canExport) return;
  setExporting(true);
  try {
    const params = new URLSearchParams({ type: activeTab });
    if (clientId) params.set("clientId", clientId);
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(to).toISOString());

    const res = await fetch(`/api/reports/pdf?${params}`);
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

`/suppliers/reports/ReportsView.tsx` is the same except: no `cartola` check (no required filter), uses `supplierId` + `/api/suppliers/reports/pdf` + `supplierReportFilename(activeTab)`.

Button: `<Button onClick={handleExportPdf} disabled={!canExport || exporting}>` with `Download` or `FileDown` icon. Tooltip via `title` attribute explains disabled reason.

## Filename helper

```ts
// src/modules/reports/utils/filename.ts
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

```ts
// src/modules/suppliers-reports/utils/filename.ts
const SUPPLIER_TAB_SLUGS: Record<SupplierReportType, string> = {
  "by-due-date": "por-pagar-x-fecha",
  "by-supplier": "por-pagar-x-proveedor",
  "daily-summary": "resumen-x-dia",
};

export function supplierReportFilename(type: SupplierReportType): string {
  const slug = SUPPLIER_TAB_SLUGS[type];
  const date = new Date().toISOString().slice(0, 10);
  return `reporte-${slug}-${date}.pdf`;
}
```

Server uses each helper for `Content-Disposition`; client mirrors it for `a.download`. Two parallel sources are intentional — server is authoritative for downloads, client fallback if the server header is stripped.

## Error matrix

| Case | API status | API body | Client UX |
|---|---|---|---|
| No session | 401 | `Unauthorized` | (Should not reach — middleware guards) |
| `type` invalid/missing | 400 | `{ error: "type inválido" }` | `alert("Tipo de reporte inválido")` |
| `cartola` without `clientId` | 400 | `{ error: "cartola requiere cliente" }` | Button disabled — never reaches here |
| Filter format invalid | 400 | `{ error: "..." }` | `alert(...)` |
| DB query fails | 500 | `{ error: "Error al generar reporte" }` | `alert("Error al generar el PDF")` |
| PDF render fails | 500 | `{ error: "Error al generar PDF" }` | Same |

Client disables button when: `loading`, `error`, `rows.length === 0`, or required filter missing. Icon swaps to `Loader2` + `animate-spin` during export.

## Testing

### Unit (Vitest)

- `reportService.runReport`:
  - Each `type` returns the right shape.
  - Filters are passed through unmodified.
  - Unknown `type` throws.
- `utils/filename.ts`:
  - `reportFilename("cartola")` → `reporte-cartola-clientes-2026-07-15.pdf`.
  - Date format is stable (regex pin).

### Playwright smoke

For each page (`/reports`, `/suppliers/reports`):
1. Login → navigate to page.
2. For each tab: apply required filter (client for cartola) → wait for rows → click "Exportar PDF" → verify file downloaded → open PDF, verify title + at least one row + (if applicable) totals.
3. Disabled state: cartola without client → button is disabled, tooltip visible.

### Edge cases to verify

- 0 rows after filtering → button disabled.
- Only `from` set (no `to`) → PDF reflects partial range.
- Tab with no `totals` (none of these have that today, but contract supports it) → no totals block.
- 200+ row cartola → verify multi-page PDF with page numbers.

## Verification plan

1. Apply migration: none (no schema change).
2. Run `npx prisma generate` — no-op, but cache reset for safety.
3. Restart dev server.
4. Manual smoke per Playwright plan above.
5. Commit + push.

## Commits

Plan to ship as 3 conventional commits (no Co-Authored-By):

1. `refactor(reports): extract runReport helper from /api/reports/route.ts`
2. `feat(reports): add PDF export — ReportsPdf + 6 sections + /api/reports/pdf`
3. `feat(suppliers-reports): add PDF export — SupplierReportsPdf + 3 sections + /api/suppliers/reports/pdf`

Then push to `main`.