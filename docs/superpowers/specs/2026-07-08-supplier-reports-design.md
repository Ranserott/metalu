# Supplier Reports Module — Design Spec

## Context

El módulo `/reports` ya cubre 6 reportes del lado de clientes (cartola, facturas pendientes, ventas, pagos, NC, saldos). Falta la cara opuesta: reportes de **proveedores** basados en `SupplierDocument`.

Hoy un proveedor puede tener documentos cargados (facturas, boletas, pagarés, etc.) con `fechaDocumento`, `fechaVencimiento`, `valor`, `estado` (PENDIENTE / PAGADO / CANCELADO). Pero no hay forma de responder preguntas como:
- ¿Qué tengo que pagar esta semana?
- ¿Cuánto le debo a cada proveedor en total?
- ¿Cuánto entró en documentos por día, separado por estado?

El usuario pidió 3 reportes puntuales en `/suppliers` que contesten eso. Decidimos una nueva página `/suppliers/reports` con tabs (espejo del patrón de `/reports`) para mantener el dominio de proveedores autocontenido y reusar los componentes ya conocidos.

## Goals

1. **`by-due-date`** — Lista plana de documentos PENDIENTE, ordenados por `fechaVencimiento ASC`. El usuario ve "qué se vence primero".
2. **`by-supplier`** — Misma data, agrupada por proveedor con encabezado de grupo (Σ valor + count). El usuario ve "a quién le debo y cuánto".
3. **`daily-summary`** — Una fila por día con desglose por estado (Pendiente / Pagado / Cancelado). El usuario ve "qué se movió por fechaDocumento".

## Non-Goals

- Exportación a PDF/Excel (futuro).
- Drill-down clickeable a la lista de documentos del día (futuro).
- Comparación entre períodos.
- Reporte "vencidos" (PENDIENTE + fechaVencimiento < hoy) — eso puede ser un 4° tab futuro si lo piden.

## Architecture

Espejo exacto de `/reports`:
- Una sola ruta API con discriminador `type`.
- Una sola página con `<Tabs>`.
- Estado de filtros compartido (supplierId + rango fechas) entre tabs.
- Cada query devuelve `{ rows, totals }`.

### File Layout

```
src/app/(dashboard)/suppliers/reports/page.tsx       [NEW] Server: auth + suppliers para dropdown
src/app/api/suppliers/reports/route.ts               [NEW] GET ?type=X&supplierId=Y&from=Z&to=W

src/modules/suppliers-reports/
├── components/
│   ├── ReportsView.tsx                              [NEW] Tabs + state compartido + fetch
│   ├── SupplierReportFilters.tsx                    [NEW] Dropdown proveedor + rango fechas
│   ├── EmptyReportState.tsx                         [NEW] Reuso del patrón /reports
│   └── tabs/
│       ├── ByDueDateTab.tsx                         [NEW] Tabla plana por fecha
│       ├── BySupplierTab.tsx                        [NEW] Tabla agrupada con headers
│       └── DailySummaryTab.tsx                      [NEW] Tabla con breakdown por estado
├── services/supplierReportService.ts                [NEW] 3 queries
├── types/report.ts                                  [NEW] 3 Row types + Totals
└── validations/reportSchemas.ts                     [NEW] Zod de type + filtros
```

Reuso (sin modificación):
- `src/components/tables/DataTable`
- `src/components/ui/badge`
- `src/components/ui/tabs`
- `src/lib/prisma/prisma`
- `src/lib/utils/formatCLP` / `formatDate`

### Routing

- Página: `/suppliers/reports` (no es sub-ruta de `/suppliers/[id]`)
- API: `/api/suppliers/reports` (paralela a `/api/reports` existente, dominio separado)

### Sidebar

En un commit aparte, agregar link "Reportes de proveedores" en `src/components/Sidebar.tsx` agrupado bajo la sección de Proveedores. Hoy no se referencia en el sidebar.

## Data Model

### `by-due-date`

```ts
// src/modules/suppliers-reports/services/supplierReportService.ts
const where = {
  estado: "PENDIENTE" as const,
  deletedAt: null,
  ...(filters.supplierId && { supplierId: filters.supplierId }),
  ...((filters.from || filters.to) && {
    fechaVencimiento: {
      ...(filters.from && { gte: filters.from }),
      ...(filters.to && { lte: filters.to }),
    },
  }),
};

const docs = await prisma.supplierDocument.findMany({
  where,
  include: { supplier: { select: { code: true, name: true } } },
  orderBy: { fechaVencimiento: "asc" },
});
```

Row (`SupplierDocByDueDateRow`):
```ts
{
  id: string,
  fechaVencimiento: Date,
  supplierCode: string,
  supplierName: string,
  tipoDocumento: SupplierDocumentType,
  nombre: string,
  documento: string,
  valor: number,
}
```

Totals: `{ total: number }`  (Σ valor)

### `by-supplier`

Mismo `where` que `by-due-date`. Diferencias:
- `orderBy: [{ supplier: { name: "asc" } }, { fechaVencimiento: "asc" }]`
- Row incluye `supplierId` para keying del group header en UI

Row (`SupplierDocBySupplierRow`): mismo shape que by-due-date + `supplierId: string`.

Totals: `{ total: number, count: number }`.

El agrupamiento visual (group headers) es 100% client-side en `BySupplierTab`: array plano ordenado por `supplierName`, se renderiza un header cada vez que cambia `supplierId`.

### `daily-summary`

`fechaDocumento` es `DateTime` con hora, así que hay que truncar a día. Una sola query agrupada:

```ts
const where = {
  deletedAt: null,
  ...(filters.supplierId && { supplierId: filters.supplierId }),
  ...((filters.from || filters.to) && {
    fechaDocumento: {
      ...(filters.from && { gte: filters.from }),
      ...(filters.to && { lte: filters.to }),
    },
  }),
};

const grouped = await prisma.supplierDocument.groupBy({
  by: ["fechaDocumento", "estado"],
  where,
  _count: { _all: true },
  _sum: { valor: true },
});

// Pivot en JS:
// - key = YYYY-MM-DD (ISO slice 0-10) por día
// - Por cada key, acumular { pendiente, pagado, cancelado } según estado
// - Calcular totalDelDia = Σ de los 3 totales
// - Devolver `fecha` como Date a medianoche UTC de ese día (UI usa formatDate)
```

Row (`DailySummaryRow`):
```ts
{
  fecha: Date,              // medianoche UTC del día
  pendiente: { count: number; total: number },
  pagado: { count: number; total: number },
  cancelado: { count: number; total: number },
  totalDelDia: number,
}
```

Totals:
```ts
{
  pendiente: { count, total },
  pagado: { count, total },
  cancelado: { count, total },
  count: number,            // Σ de los 3 counts
  total: number,            // Σ de los 3 totales
}
```

## API

### `GET /api/suppliers/reports`

Query params (validados con Zod):
```
type: "by-due-date" | "by-supplier" | "daily-summary"  (required)
supplierId?: UUID
from?: ISO date string
to?: ISO date string
```

Flujo:
1. `auth()` — si no hay session → 401 `{ error: "No autorizado" }`
2. `reportSchema.safeParse(searchParams)` — si falla → 400 `{ error: issues.join(", ") }`
3. Switch por `type` → llama a la query correspondiente
4. Devuelve `{ rows, totals }`

Errores inesperados: try/catch central con `console.error("[suppliers-reports] ...", err)` y 500 `{ error: "Error al generar reporte" }` (mensaje saneado, no expone internals).

## Validations (Zod)

```ts
// src/modules/suppliers-reports/validations/reportSchemas.ts
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

## UI

### `ReportsView.tsx`

Igual patrón que `src/modules/reports/components/ReportsView.tsx`:
- Estado: `activeTab`, `supplierId`, `from`, `to`, `rows`, `totals`, `loading`, `error`
- `useEffect` que dispara fetch cuando cambian los filtros
- `showDateRange = true` siempre (los 3 reportes usan fechas)
- `supplierRequired = false`
- TabsList con 3 TabsTriggers
- TabsContent por cada tab que renderiza el componente correspondiente

### `SupplierReportFilters.tsx`

Copia adaptada de `src/modules/reports/components/ReportFilters.tsx`:
- Dropdown "Proveedor" (Select con "Todos los proveedores" + lista de suppliers)
- Date inputs "Desde" / "Hasta" (idénticos)
- Layout `flex flex-wrap items-end gap-4`
- Acepta `suppliers: SupplierOption[]` en vez de `clients: ClientOption[]`

### Tabs

Cada tab es un Client Component que recibe `{ rows, totals, loading }` y:
- Si loading → muestra "Cargando..."
- Si rows vacío → muestra `<EmptyReportState message="..." />`
- Sino → `<DataTable columns={...} data={rows} />` + bloque de totales

**`ByDueDateTab`** columns:
| Fecha Vencimiento | Proveedor | Tipo | Nombre | N° Documento | Valor |
Formateo: fecha con `formatDate`, valor con `formatCLP`, Tipo con `SUPPLIER_DOCUMENT_TYPE_LABELS`, Proveedor como `${code} · ${name}`.

**`BySupplierTab`** columns (mismas que by-due-date, sin columna Proveedor porque ya está en el group header):
| Fecha Vencimiento | Tipo | Nombre | N° Documento | Valor |
Group header (entre cambios de supplier): fila destacada con `Proveedor: {name} · Σ {total} · {count} docs`.

**`DailySummaryTab`** columns:
| Fecha | Pendiente | Pagado | Cancelado | Total del día |
Cada celda de estado renderiza: `${count} docs · {formatCLP(total)}`. Si count=0 muestra `—`.

## Error Handling

- API: descripto arriba (auth, Zod, central try/catch)
- UI: error state con `bg-red-50` border + mensaje del backend
- Empty state: componente con icono + mensaje específico por tab
- Loading: "Cargando..." en bloque gris

## Testing

Script Playwright `/tmp/verify-supplier-reports.mjs`:
1. Login admin
2. Crear 2 proveedores (via fetch directo a `/api/suppliers` o via UI si existe)
3. Crear 3 documentos via `/api/suppliers/[id]/documents`:
   - Proveedor A: factura 100k PENDIENTE, vence hoy+5
   - Proveedor A: boleta 50k PENDIENTE, vence hoy+30
   - Proveedor B: factura 200k PAGADO, fechaDocumento = hoy
4. Navegar `/suppliers/reports`
5. **Tab "Por pagar x fecha"**: verificar 2 filas (A factura, A boleta) en ese orden
6. **Tab "Por pagar x proveedor"**: verificar header "Proveedor A · Σ $150k · 2 docs" + 2 filas
7. **Tab "Resumen x día"**: verificar 1 fila con Pagado 1 docs $200k + Pendiente 2 docs $150k
8. Filtrar por "Proveedor A": verificar tabs 1 y 2 muestran solo docs de A
9. Filtrar por fecha futura: verificar resumen x día queda vacío
10. Screenshot final `/tmp/supplier-reports.png`
11. Verificar `errors.length === 0`

## Commits

Plan: 5 commits conventional (sin `Co-Authored-By`):
1. `feat(suppliers-reports): add types + Zod schemas`
2. `feat(suppliers-reports): add service with 3 query functions`
3. `feat(suppliers-reports): add GET /api/suppliers/reports route`
4. `feat(suppliers-reports): add ReportsView + SupplierReportFilters + 3 tab components`
5. `feat(suppliers-reports): add /suppliers/reports page + sidebar link`

Smoke test commit aparte al final si hace falta documentar el script.

## Risks / Open Questions

- **Volumen**: si un proveedor tiene 500 docs pendientes, el reporte 2 renderiza 500 filas con group headers. Aceptable por ahora (escalable a paginación si pasa).
- **Soft-delete en summary**: los 3 queries respetan `deletedAt: null`.
- **Date semantics**: por pagar usa `fechaVencimiento`, resumen usa `fechaDocumento`. UI muestra el Label correcto ("Fecha Vencimiento" vs "Fecha Documento") para que sea claro al usuario.
- **UTC vs local**: Prisma devuelve DateTime en UTC. `formatDate` ya usa `es-CL` locale. Sin cambios.