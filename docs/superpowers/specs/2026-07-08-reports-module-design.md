# Reports Module Design

Date: 2026-07-08
Status: Shipped (commits e9e3357, c70152c, 01bb3c0)
Branch: worktree-feature+users-roles-module

## Schema corrections discovered during implementation

The original spec referenced `Invoice.saldo`, `Invoice.abonos`, and an Invoice "Motivo" field — **none of these exist in the schema**. Implementation diverged from spec as follows:

- **Saldo is computed**, not stored. `saldo = Invoice.total − Σ Payment.amount WHERE status='PAGADO'`
- **Notas Crédito `Motivo` column dropped** — no field for it; only `number`, `clientName`, `total`, `issueDate`
- **Cartola `Detalle` column** is built from `Invoice.number + workOrderId` for invoices, and `Payment.reference || 'Pago ' + method` for payments

## Goal

Replace the mock `/reports` page with a real, read-only reports module exposing 6 distinct reports backed by Prisma queries. No exports. Single page with tabs. Filters per tab (client + date range).

## Decisions (from brainstorming)

- **6 reports**: Cartola clientes, Facturas pendientes, Ventas, Pagos, Notas crédito, Saldos
- **Cartola vs Saldos**: distinct. Cartola = detailed statement per client (movements + running balance). Saldos = summary list with current balance per client.
- **No exports** — display only (no PDF, Excel, CSV, or print)
- **Filters**: client dropdown (always visible) + date range (visible on temporal tabs)
- **Layout**: single page with 6 tabs

## File Structure

```
src/app/(dashboard)/reports/page.tsx                                    [REPLACE]
src/app/api/reports/route.ts                                            [NEW]

src/modules/reports/
├── components/
│   ├── ReportsView.tsx                                                 [NEW]
│   ├── ReportFilters.tsx                                               [NEW]
│   ├── EmptyReportState.tsx                                            [NEW]
│   ├── ReportTable.tsx                                                 [DELETE — mock-only]
│   ├── ReportForm.tsx                                                  [DELETE — was mock]
│   └── tabs/
│       ├── CartolaTab.tsx                                              [NEW]
│       ├── PendingInvoicesTab.tsx                                      [NEW]
│       ├── SalesTab.tsx                                                [NEW]
│       ├── PaymentsTab.tsx                                             [NEW]
│       ├── CreditNotesTab.tsx                                          [NEW]
│       └── BalancesTab.tsx                                             [NEW]
├── services/reportService.ts                                           [REPLACE — remove mocks]
├── types/report.ts                                                     [REPLACE — 6 row types]
└── validations/reportSchemas.ts                                        [REPLACE — Zod for query params]
```

## API

`GET /api/reports?type=<cartola|pending-invoices|sales|payments|credit-notes|balances>&clientId=&from=&to=`

- Auth: `auth()` middleware (any authenticated user)
- Returns `{ rows: T[], totals?: { ... } }` where `T` depends on `type`
- Empty result returns `{ rows: [], totals: undefined }` (not 404)

## Per-report Specs

### 1. Cartola Clientes

- **Filters**: clientId (REQUIRED), from/to (optional, default = all time)
- **Columns**: Fecha | Tipo | Nº Documento | Detalle | Cargo | Abono | Saldo
- **Data**: merged timeline of `Invoice(type=INVOICE) + Payment + Invoice(type=CREDIT_NOTE)` for the client, sorted by date asc
- **Saldo**: running total = `Σ cargos − Σ abonos` up to and including this row
- **Totals row**: Σ cargos, Σ abonos, saldo final
- **Empty state (no client)**: "Seleccioná un cliente para ver su cartola"
- **Empty state (no data)**: "No hay movimientos para el rango seleccionado"

### 2. Facturas Pendientes

- **Filters**: clientId (optional), from/to (optional, default = no range)
- **Columns**: Emisión | Vencimiento | Nº Factura | Cliente | Total | Saldo | Días vencido
- **Query**: `Invoice.status IN (ISSUED, OVERDUE) AND saldo > 0`, sorted by `issueDate desc`
- **Días vencido**: `today - dueDate` if `status = OVERDUE`, else `—`
- **Totals row**: Σ saldo

### 3. Ventas

- **Filters**: from/to (default = current month: 1st → today), clientId (optional)
- **Columns**: Emisión | Nº Factura | Cliente | Neto | IVA | Total | Estado
- **Query**: `Invoice.type = INVOICE`, sorted by `issueDate desc`
- **Estado**: badge using existing `statusLabels/statusColors`
- **Totals row**: Σ neto, Σ iva, Σ total

### 4. Pagos

- **Filters**: from/to (default = current month), clientId (optional)
- **Columns**: Fecha pago | Nº Pago | Cliente | Método | Monto | Estado
- **Query**: `Payment.status = PAGADO`, sorted by `date desc`
- **Totals row**: Σ monto

### 5. Notas Crédito

- **Filters**: from/to (default = current month), clientId (optional)
- **Columns**: Emisión | Nº NC | Cliente | Total | Motivo
- **Query**: `Invoice.type = CREDIT_NOTE`, sorted by `issueDate desc`
- **Totals row**: Σ total

### 6. Saldos

- **Filters**: clientId (optional — to view one client)
- **Columns**: Cliente | Código | Total facturado | Total pagado | Notas crédito | Saldo actual
- **Query**: aggregate per client (groupBy clientId with sums)
- **Saldo**: `facturado − pagado − NC`
- **Sort**: Saldo actual desc (deudores arriba)
- **Totals row**: Σ saldo actual (deuda total de la cartera)

## Common Formatting

- **Currency**: CLP with `.` thousands separator (reuse existing `clp()` formatter from billing module)
- **Dates**: `dd/MM/yyyy`
- **Statuses**: badge with colors from existing `statusLabels/statusColors`
- **Tables**: use existing `<DataTable>` from `@/components/tables/DataTable`

## Error Handling

- API failure → toast via shadcn `<Toaster>` + error message in the active tab
- Empty data → `<EmptyReportState>` with report-specific copy
- Cartola without client → "Seleccioná un cliente para ver su cartola"
- Loading state → skeleton rows while fetching

## Permissions

Follows the existing `auth()` pattern. Any authenticated user can view reports (matching the existing `/quotations`, `/work-orders` access pattern). No role restriction in v1.

## Field-Name Verification (for implementation)

The spec assumes these Prisma field names — must verify against `prisma/schema.prisma` before implementation:
- `Invoice.type` (INVOICE/CREDIT_NOTE), `Invoice.status` (DRAFT/ISSUED/PAID/OVERDUE/CANCELLED)
- `Invoice.saldo`, `Invoice.abonos`, `Invoice.issueDate`, `Invoice.dueDate`, `Invoice.paidAt`
- `Payment.status` (PENDIENTE/PAGADO/CANCELLED), `Payment.method` (CASH/BANK_TRANSFER/CHECK/CARD)
- `Client.currentBalance`, `Client.code`

## Testing

- **Vitest unit tests** for each of the 6 query functions in `reportService.ts` (mock Prisma client)
- **Manual smoke test**: log in as admin → `/reports` → click each tab → verify data renders → change filters → verify data updates → test with empty data (no client selected for cartola)

## Implementation Order

1. Verify Prisma field names against schema
2. Replace `types/report.ts` with 6 row types
3. Replace `validations/reportSchemas.ts` with query-param Zod schema
4. Replace `services/reportService.ts` with 6 real query functions + vitest
5. Create `/api/reports/route.ts`
6. Create `ReportsView.tsx`, `ReportFilters.tsx`, `EmptyReportState.tsx`
7. Create 6 tab components
8. Update `page.tsx` to render `<ReportsView>`
9. Delete `ReportTable.tsx`, `ReportForm.tsx` (mock-only)
10. Manual smoke test

## Out of Scope

- PDF/Excel/CSV export
- Print view
- Charts/visualizations
- Saved filter preferences per user
- Email scheduling
- Date range presets (last 7/30/90 days buttons)
- Server-side pagination (use client-side for v1 — small data volumes)