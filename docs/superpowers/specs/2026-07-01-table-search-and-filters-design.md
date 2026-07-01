# Table Search & Column Filters — Design Spec

**Date:** 2026-07-01
**Status:** Approved — ready for implementation plan
**Scope:** Search + filter system for the 4 main tables (Trabajos, Clientes, Cotizaciones, Proveedores) in MetalFlow ERP.

## Problem

The 4 main tables currently have NO way to find a specific row when there are more than 10-20 entries. Users have to scroll, eyeball-match, or use browser Ctrl-F (which only searches visible text and breaks on pagination). The user has asked for "filter systems in the tables and a smart search" — interpreted as full-text search across multiple relevant columns plus per-column dropdown filters.

## Goal

Add a **shared, reusable toolbar** above each of the 4 tables that combines:

1. A **full-text search input** that matches across multiple relevant columns of a row (with debounce + accent-insensitive matching for Spanish).
2. **Per-column dropdown filters** (Estado for Clientes/Proveedores/Trabajos/Cotizaciones, Ciudad for Proveedores, Cliente for Trabajos) that act as AND-filters alongside the search.

All filtering happens **client-side**, leveraging tanstack/react-table's built-in `getFilteredRowModel` and `getFacetedRowModel`. Zero changes to Prisma, services, API routes, or validation schemas.

## Non-Goals (YAGNI)

- Server-side filtering via `useSearchParams` / query params.
- Fuzzy matching beyond Spanish accent normalization (no Levenshtein).
- Date-range filters (can be a follow-up feature if requested).
- Persisting filter state across navigation (resets on unmount).
- Virtualization for tables with thousands of rows (current volumes are <500).
- Bookmarkable filtered URLs.
- Search highlighting in cells.

## Architecture

Three new shared UI components in `src/components/tables/`, plus a small refactor to the existing `DataTable` wrapper:

```
src/components/tables/
├── DataTable.tsx              (MODIFIED: accepts controlled state)
├── TableToolbar.tsx           (NEW)
├── SearchInput.tsx            (NEW)
└── ColumnFilterSelect.tsx     (NEW)

src/modules/<modulo>/
└── constants/
    ├── searchableKeys.ts      (NEW per module)
    └── tableFilters.ts        (NEW per module)
```

### Component Responsibilities

**`SearchInput.tsx`** — Single-line text input wrapped around shadcn `<Input>`.
- Props: `value: string`, `onChange: (v: string) => void`, `placeholder?: string`, `debounceMs?: number` (default 250).
- Internal `useDebouncedValue` hook propagates debounced value up to `onChange`.
- Visual: `Search` icon (lucide) on the left, clear `X` button on the right (only when `value` is non-empty).
- Width: `w-72` by default, `flex-1 max-w-sm` when in toolbar.

**`ColumnFilterSelect.tsx`** — shadcn `<Select>` wrapper.
- Props: `value: string | undefined`, `onChange: (v: string | undefined) => void`, `options: { value: string; label: string }[]`, `placeholder: string`, `clearable?: boolean` (default true).
- When `clearable`, renders a "Limpiar" item at the top with `value: undefined`.
- Width: `w-44` default.

**`TableToolbar.tsx`** — Composes SearchInput + N ColumnFilterSelect in a horizontal row.
- Props:
  ```ts
  type ColumnFilterDef = {
    key: string;                         // matches ColumnDef accessorKey or id
    label: string;                       // shown above dropdown
    options: { value: string; label: string }[];
  };
  type TableToolbarProps = {
    searchPlaceholder: string;
    searchValue: string;
    onSearchChange: (v: string) => void;
    filters: ColumnFilterDef[];
    filterValues: Record<string, string | undefined>;
    onFilterChange: (key: string, value: string | undefined) => void;
    onClearAll?: () => void;
  };
  ```
- Layout: `<div className="flex items-center gap-3 flex-wrap">`. SearchInput on the left, filter dropdowns on the right.
- When `Object.values(filterValues).filter(Boolean).length > 0`, shows a small "Limpiar filtros" `<Button variant="ghost" size="sm">` to the right.
- Renders NO bottom border — sits in the same `<div className="space-y-4">` parent as the DataTable.

**`DataTable.tsx`** — Modified to accept controlled filter state.
- New optional props: `globalFilter?: string`, `onGlobalFilterChange?: (v: string) => void`, `columnFilters?: ColumnFiltersState`, `onColumnFiltersChange?: (updater: ColumnFiltersState | ((old: ColumnFiltersState) => ColumnFiltersState)) => void`.
- When provided, passes them to `useReactTable({ state: ... })`. Defaults preserve existing behavior (no filter applied externally).
- Adds a new optional prop: `globalFilterFn?: FilterFn<T>` — when set, applied to `useReactTable({ filterFns: { global: fn }, globalFilterFn: fn })`. When NOT set, falls back to tanstack's default includesString filter.
- Does NOT render the toolbar itself — each `*Table.tsx` mounts `<TableToolbar>` + `<DataTable>` as siblings.

### Per-Module Constants

Each module exports 2 files in `src/modules/<modulo>/constants/`:

**`searchableKeys.ts`** — list of keys whose values are concatenated into the search blob.
```ts
// src/modules/clients/constants/searchableKeys.ts
export const CLIENT_SEARCHABLE_KEYS: (keyof Client | "city")[] = [
  "code", "name", "contact", "email", "phone", "address", "city",
];
```

**`tableFilters.ts`** — declarative filter definitions.
```ts
// src/modules/clients/constants/tableFilters.ts
import type { ColumnFilterDef } from "@/components/tables/TableToolbar";
export const CLIENT_TABLE_FILTERS: ColumnFilterDef[] = [
  {
    key: "isActive",
    label: "Estado",
    options: [
      { value: "true", label: "Activo" },
      { value: "false", label: "Inactivo" },
    ],
  },
];
```

### Per-Table Filter Function

Each `*Table.tsx` defines a local `globalFilterFn` that:
1. Reads `SEARCHABLE_KEYS` (and any nested fields like `client.name`) from `row.original`.
2. Joins all values into a single lowercased, accent-stripped string.
3. Returns true if `filterValue` (also normalized) `.includes()` matches.

The helper `normalize(str)` does `str.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")` to strip diacritics (so "ñuble" matches "nuble" and vice-versa).

## Per-Table Specifications

### Clients (`/clients`)

- **Searchable keys:** `code`, `name`, `contact`, `email`, `phone`, `address`, `city`
- **Column filters:**
  - `Estado` → `[{true:"Activo"}, {false:"Inactivo"}]`
- **Nested fields:** None.

### Quotations (`/quotations`)

- **Searchable keys:** `number`, `client.name`, `notes`
- **Column filters:**
  - `Estado` → `[{DRAFT:"Borrador"}, {SENT:"Enviado"}, {APPROVED:"Aprobado"}, {REJECTED:"Rechazado"}]`
- **Nested fields:** `client.name` accessed via `row.original.client?.name ?? ""`.

### Work Orders (`/work-orders`)

- **Searchable keys:** `number`, `title`, `rut`, `razonSocial`, `client.name`, `encargado`
- **Column filters:**
  - `Estado` → `[{TODO:"Pendiente"}, {IN_PROGRESS:"En Progreso"}, {QUALITY_CHECK:"Control de Calidad"}, {COMPLETED:"Completado"}]`
  - `Cliente` → dynamic, derived from `Array.from(new Set(data.map(d => d.client?.name).filter(Boolean)))`.
- **Nested fields:** `client.name` via `row.original.client?.name ?? ""`.

### Suppliers (`/suppliers`)

- **Searchable keys:** `code`, `name`, `contact`, `ciudad`, `phone`, `email`, `address`
- **Column filters:**
  - `Estado` → `[{true:"Activo"}, {false:"Inactivo"}]`
  - `Ciudad` → dynamic, derived from `Array.from(new Set(data.map(d => (d as any).ciudad).filter(Boolean)))`.
- **Note:** `Supplier` TS type does NOT currently declare `ciudad`, but the runtime data (and `SupplierTable.tsx`) already uses `row.original.ciudad`. The cast `(d as any).ciudad` documents this known type drift; a follow-up can extend the `Supplier` type to include `ciudad: string | null`.

## Data Flow

```
[SearchInput keystroke]
   ↓ local state (immediate, for input UX)
[useDebouncedValue 250ms]
   ↓ onSearchChange(value)
[*Table.tsx useState<string>("")]
   ↓ value prop
[DataTable state.globalFilter]
   ↓
[tanstack globalFilterFn] → checks row.original against SEARCHABLE_KEYS
   ↓
[getFilteredRowModel]
   ↓
[TableBody renders filtered rows]

[ColumnFilterSelect click]
   ↓ onChange(value)
[*Table.tsx setFilterValues({ ... })]
   ↓ columnFilters = [{ id: "status", value: "TODO" }]
[DataTable state.columnFilters]
   ↓
[getFilteredRowModel ANDs with globalFilter]
   ↓
[TableBody renders filtered rows]
```

The `AND` combination is automatic — `getFilteredRowModel` returns rows that satisfy both `globalFilter` AND every `columnFilter`.

## Edge Cases

1. **Empty search:** `globalFilter = ""` → tanstack returns all rows. Clear button hidden.
2. **No filters active:** No "Limpiar" button shown.
3. **No matches:** DataTable's existing empty-state message `"No hay datos disponibles"` shows automatically (`table.getRowModel().rows.length === 0`).
4. **Accent normalization:** `"ñuble"`, `"nuble"`, `"NUBLE"` all match each other.
5. **Nested null fields:** `row.original.client?.name ?? ""` — never throws.
6. **State reset on unmount:** No persistence; each table's `useState` is local. Navigating away and back clears filters. Documented as intentional in CLAUDE-style.
7. **Dynamic filter lists** (Cliente, Ciudad): computed via `useMemo` keyed on `data` so they update if data refreshes.
8. **Debounce cleanup:** `useDebouncedValue` returns `useEffect` cleanup that cancels pending timer on unmount. No memory leaks.

## Files to Create

- `src/components/tables/SearchInput.tsx`
- `src/components/tables/ColumnFilterSelect.tsx`
- `src/components/tables/TableToolbar.tsx`
- `src/hooks/useDebouncedValue.ts` (helper hook)
- `src/modules/clients/constants/searchableKeys.ts`
- `src/modules/clients/constants/tableFilters.ts`
- `src/modules/quotations/constants/searchableKeys.ts`
- `src/modules/quotations/constants/tableFilters.ts`
- `src/modules/work-orders/constants/searchableKeys.ts`
- `src/modules/work-orders/constants/tableFilters.ts`
- `src/modules/suppliers/constants/searchableKeys.ts`
- `src/modules/suppliers/constants/tableFilters.ts`

## Files to Modify

- `src/components/tables/DataTable.tsx` — accept controlled `globalFilter` + `columnFilters` + `globalFilterFn`.
- `src/modules/clients/components/ClientTable.tsx` — integrate toolbar, define `globalFilterFn`.
- `src/modules/quotations/components/QuotationTable.tsx` — integrate toolbar, define `globalFilterFn`.
- `src/modules/work-orders/components/WorkOrderTable.tsx` — integrate toolbar, define `globalFilterFn`, dynamic Cliente filter.
- `src/modules/suppliers/components/SupplierTable.tsx` — integrate toolbar, define `globalFilterFn`, dynamic Ciudad filter.

## Implementation Order (5 commits)

1. **`feat(tables): add SearchInput + ColumnFilterSelect primitives`** — new components + `useDebouncedValue` hook.
2. **`feat(tables): add TableToolbar shared component`** — composes the primitives.
3. **`refactor(tables): DataTable accepts controlled globalFilter + columnFilters`** — backward-compatible opt-in.
4. **`feat(clients): add search + status filter to clients table`** — first end-to-end integration; validates the pattern.
5. **`feat(quotations,work-orders,suppliers): add search + column filters to remaining 3 tables`** — reuses the pattern + dynamic filter lists for Cliente and Ciudad.

No `Co-Authored-By` per repo convention. Conventional commits.

## Verification

Manual smoke test per table (clientes first, then the other 3):

1. Restart `next dev`.
2. Visit `/clients`. Toolbar visible with search + Estado dropdown.
3. Type "ñuble" → only matching clients show. Type "nuble" → same results (accent normalization).
4. Select "Activo" → results narrow further. Counter `"X resultados"` updates.
5. Combine: type "metal" + Estado "Inactivo" → AND-filter applied.
6. Click `X` on search → text clears, Estado filter remains.
7. Click "Limpiar filtros" → both reset, all rows return.
8. Filter with zero matches → "No hay datos disponibles".
9. Repeat on `/quotations` (Estado only), `/work-orders` (Estado + dynamic Cliente), `/suppliers` (Estado + dynamic Ciudad).
10. Navigate away and back → state reset (expected).
11. DevTools: confirm debounce timer is cancelled on unmount (no leaked timers in Performance tab).

## Risks

- **Stale type for Supplier.ciudad** — already a known drift. Spec acknowledges it via `(d as any).ciudad` cast; does NOT fix it in this scope.
- **Tanstack `globalFilterFn` typing** — FilterFn<T> generic must be widened. If too painful, fall back to `any` cast and document. No runtime impact.
- **WorkOrderTable's nested `client` is `optional`** in the type. Code already handles `?.` correctly throughout the codebase.