# Módulo de Pagos — Accounts Payable

**Fecha:** 2026-05-28
**Estado:** Aprobado
**Ubicación:** `/payments`

---

## Resumen

Módulo de Accounts Payable (AP) para registrar documentos de deuda con proveedores. Permite ingresar, modificar, cancelar y visualizar facturas, boletas, pagarés, cheques y otros documentos de proveedores.

---

## Diseño UI

### Layout: Collapsible Accordion

```
┌─────────────────────────────────────────────────────────────┐
│ ▸ INGRESAR DOCUMENTO                      (barra clickeable)│
└─────────────────────────────────────────────────────────────┘
```

Al hacer click en la barra, se expande el formulario:

```
┌─────────────────────────────────────────────────────────────┐
│ ▾ INGRESAR DOCUMENTO                                        │
├─────────────────────────────────────────────────────────────┤
│ RUT Proveedor: [________] [···]   Nombre: [___________]     │
│ Tipo Documento: [FA ▼]           N° Doc: [___________]     │
│ Fecha Documento: [28-05-2026]    Valor: [___________]     │
│ Fecha Vencimiento: [__-__-____]  Estado: [PENDIENTE ▼]    │
│                                                              │
│                                    [LIMPIAR] [GRABAR]       │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  TABLA — Documentos de Proveedor                           │
│  RUT | Nombre | Tipo | N°Doc | Fecha | Valor | Venc | Est │ Acc │
│  ──────────────────────────────────────────────────────────│
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Campos del Formulario

| Campo | Tipo | Validación | Notes |
|-------|------|------------|-------|
| RUT Proveedor | Input + botón "···" | Requerido, formato RUT | Botón abre modal de proveedores |
| Nombre | Input texto | Solo lectura | Autocompletado desde proveedor |
| Tipo Documento | Dropdown | Requerido | FA, BO, PA, OT, CH |
| N° Documento | Input texto | Requerido | |
| Fecha Documento | Date picker | Requerido | Default: hoy |
| Valor | Input número | Requerido, > 0 | Monto total del documento |
| Fecha Vencimiento | Date picker | Opcional | |
| Estado | Dropdown | Requerido | PENDIENTE, PAGADO, CANCELLED |

---

## Tipos de Documento

| Código | Descripción |
|--------|-------------|
| FA | Factura |
| BO | Boleta |
| PA | Pagaré |
| OT | Otros |
| CH | Cheque |

---

## Estados

| Estado | Descripción |
|--------|-------------|
| PENDIENTE | Documento registrado, pendiente de pago |
| PAGADO | Documento totalmente cancelado |
| CANCELLED | Documento anulado (requiere motivo) |

**Regla:** El documento SIEMPRE se puede modificar, independientemente del estado.

---

## Modal de Selección de Proveedor

Se abre al hacer click en el botón "···" junto al campo RUT Proveedor.

**Contenido:**
- Campo de búsqueda (filtra por RUT o nombre)
- Tabla con columnas: RUT, Nombre
- Click en una fila → selecciona proveedor → autocompleta RUT + Nombre en el formulario
- Botón Cerrar para cancelar

---

## Acciones

### Formulario

| Acción | Comportamiento |
|--------|---------------|
| LIMPIAR | Resetea todos los campos del formulario a vacío |
| GRABAR | Guarda el documento, mantiene el formulario abierto |

### Grilla

| Acción | Comportamiento |
|--------|---------------|
| Editar (lápiz) | Carga el documento en el formulario para modificación |
| Cancelar (X) | Abre modal para ingresar motivo de cancelación, luego cambia estado a CANCELLED |

---

## Modal de Cancelación

Aparece al intentar cancelar un documento. Incluye:
- Campo de texto para motivo de cancelación (requerido)
- Botones: Confirmar (cambia estado a CANCELLED), Cancelar

---

## Data Model

Extensión del modelo `Payment` existente en Prisma:

```prisma
model Payment {
  id              String    @id @default(cuid())
  supplierId      String    // Relación con Supplier
  documentType    String    // FA, BO, PA, OT, CH
  documentNumber  String    // N° de documento
  documentDate    DateTime  // Fecha del documento
  dueDate         DateTime? // Fecha de vencimiento
  amount          Decimal   // Valor total
  status          String    @default("PENDIENTE") // PENDIENTE, PAGADO, CANCELLED
  cancellationReason String? // Motivo de cancelación (si status = CANCELLED)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?

  supplier        Supplier  @relation(fields: [supplierId], references: [id])
  createdBy       User      @relation(...)
}
```

---

## Validaciones (Zod)

```typescript
const paymentSchema = z.object({
  supplierId: z.string().min(1, "Proveedor requerido"),
  documentType: z.enum(["FA", "BO", "PA", "OT", "CH"]),
  documentNumber: z.string().min(1, "N° de documento requerido"),
  documentDate: z.date(),
  dueDate: z.date().optional().nullable(),
  amount: z.number().positive("El valor debe ser mayor a 0"),
  status: z.enum(["PENDIENTE", "PAGADO", "CANCELLED"]),
  cancellationReason: z.string().optional(),
})
```

---

## Endpoints

| Método | Path | Descripción |
|--------|------|-------------|
| GET | /api/payments | Lista todos los payments |
| GET | /api/payments/[id] | Obtiene un payment |
| POST | /api/payments | Crea un payment |
| PUT | /api/payments/[id] | Modifica un payment (siempre disponible) |
| PATCH | /api/payments/[id]/cancel | Cancela con motivo |

---

## Filtros en Grilla

- Búsqueda por RUT/Nombre proveedor
- Filtro por Tipo de Documento
- Filtro por Estado
- Ordenamiento por columna
- Paginación

---

## Componentes a Crear/Modificar

1. **`/src/app/(dashboard)/payments/page.tsx`** — Página principal
2. **`/src/modules/payments/components/PaymentAccordion.tsx`** — Formulario collapsible
3. **`/src/modules/payments/components/PaymentTable.tsx`** — Grilla con acciones
4. **`/src/modules/payments/components/SupplierModal.tsx`** — Modal de selección de proveedor
5. **`/src/modules/payments/components/CancelModal.tsx`** — Modal de motivo de cancelación
6. **`/src/modules/payments/services/paymentService.ts`** — CRUD operations
7. **`/src/modules/payments/validations/payment.ts`** — Zod schemas
8. **API Routes** en `/src/app/api/payments/`
