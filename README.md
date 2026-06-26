# MetalFlow ERP

Sistema de gestión (ERP) para **SOC. MECÁNICA Y METALÚRGICA ÑUBLE LTDA** — metalúrgica chilena. Maneja cotizaciones, órdenes de trabajo, compras, facturación, pagos, clientes, proveedores y roles/usuarios.

## Stack

- **Next.js 15** (App Router, `src/app/` con route groups `(auth)` y `(dashboard)`)
- **React 19**
- **Prisma 7** (output a `src/generated/prisma/`, `engineType = "library"`)
- **PostgreSQL** (Supabase en producción)
- **NextAuth v5** (`auth()` desde `@/lib/auth/auth`)
- **shadcn/ui** envuelto en `@/components/ui/*` (Dialog, Select, Button, etc.)
- **Tailwind CSS** + tema por CSS vars (`--theme-primary`, `--theme-dark`)
- **`@react-pdf/renderer`** para generación de PDFs server-side
- **EB Garamond** como tipografía del sistema (registrada localmente vía `@fontsource/eb-garamond` para PDFs)

## Módulos

Cada módulo vive en `src/modules/<nombre>/` con la misma estructura:

```
src/modules/<nombre>/
├── components/
├── services/        ← lógica de negocio (Prisma)
├── validations/     ← Zod schemas
├── types/           ← TypeScript types
└── pdf/             ← (opcional) PDF documents via @react-pdf/renderer
```

| Módulo              | Ruta                  | Descripción                                                   |
|---------------------|-----------------------|---------------------------------------------------------------|
| Dashboard           | `/dashboard`          | Resumen general (KPIs, actividad reciente)                    |
| Clientes            | `/clients`            | CRUD clientes con RUT, dirección, contacto                    |
| Encargados          | `/encargados`         | Contactos vinculados a clientes                               |
| Cotizaciones        | `/quotations`         | Cotizaciones con PDF imprimible                               |
| Trabajos (OT)       | `/work-orders`        | Órdenes de trabajo con PDF (Solicitud OT), estado, totales    |
| Solicitudes OC      | `/solicitudes`        | Solicitudes de orden de compra (3-paso)                       |
| Compras             | `/purchases`          | Órdenes de compra                                             |
| Facturación         | `/billing`            | Facturas / documentos tributarios                             |
| Pagos               | `/payments`           | Pagos, cuentas por cobrar                                     |
| Proveedores         | `/suppliers`          | Proveedores                                                   |
| Reportes            | `/reports`            | Reportes generales                                            |
| Usuarios y Roles    | `/users`, `/roles`    | RBAC: roles, permisos, asignación                            |
| Auditoría           | `/audit-logs`         | Bitácora de cambios                                           |

## Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/           ← login, register (sin layout autenticado)
│   ├── (dashboard)/      ← rutas autenticadas con layout + sidebar
│   └── api/              ← route handlers (REST)
├── components/
│   ├── ui/               ← primitivos shadcn re-exportados
│   ├── layout/           ← Header, Sidebar
│   └── tables/           ← DataTable (tanstack/react-table wrapper)
├── modules/              ← lógica por dominio (ver tabla arriba)
├── lib/
│   ├── auth/             ← NextAuth v5 config
│   ├── prisma/           ← singleton de PrismaClient
│   └── pdf/              ← registerPdfFonts() (EB Garamond local)
├── config/               ← COMPANY (header info para PDFs)
├── generated/prisma/     ← Prisma Client generado (no editar)
├── middleware.ts         ← auth middleware
└── store/                ← Zustand stores (sidebar, etc.)
```

## Setup

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno
cp .env.example .env
# completar DATABASE_URL, AUTH_SECRET, etc.

# 3. Generar Prisma client + migrar DB
npx prisma generate
npx prisma migrate dev

# 4. Seed inicial
npm run seed

# 5. Dev server
npm run dev
```

## Convenciones

- **Commits**: convención conventional (`feat:`, `fix:`, `style:`, etc.). NO se agrega `Co-Authored-By` ni atribución de IA.
- **Sin builds** innecesarios — `next dev` levanta solo.
- **PDFs server-side**: `@react-pdf/renderer` corre en Node plano. Hay que usar:
  - paths absolutos via `path.join(process.cwd(), ...)` para fonts y assets (NO webpack aliases, NO `/public/...`).
  - fonts **.woff** (NO .woff2 — fontkit 2.0.4 tiene un bug de brotli decompression).
  - pasar el `Buffer` directo a `NextResponse` (NO envolver en `new Uint8Array(...)` — produce 0 bytes).
  - `<Image>` con `width` Y `height` explícitos (intrinsic del SVG no respeta solo `width`).
- **Sin nuevos modelos** salvo que sea estrictamente necesario — constraint histórico del usuario. Inputs nuevos van como `<input>` dentro del módulo.

## PDF generation

Helper compartido en `src/lib/pdf/fonts.ts`:

```ts
import { registerPdfFonts, PDF_FONT_FAMILY } from "@/lib/pdf/fonts";
registerPdfFonts();
// luego style={{ fontFamily: PDF_FONT_FAMILY }} en <Text>
```

Patrón de ruta:

```ts
// src/app/api/<module>/[id]/pdf/route.ts
const buffer = await pdf(createElement(MyPdf, { data })).toBuffer();
return new NextResponse(buffer, {
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${name}.pdf"`,
    "Content-Length": String(buffer.byteLength),
    "Cache-Control": "no-store",
  },
});
```

## Documentación adicional

- `docs/superpowers/specs/` — diseños de módulos (objetivo, modelo de datos, UX)
- `docs/superpowers/plans/` — implementación paso a paso
- `graphify-out/` — knowledge graph de la codebase (vía `/graphify`)