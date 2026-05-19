# MetalFlow ERP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 1 foundation of MetalFlow ERP — a LAN-based industrial management system with Next.js 15, Prisma/PostgreSQL, authentication, and all module shells.

**Architecture:** Monolithic Next.js 15 application with App Router. Prisma ORM connects to local PostgreSQL. NextAuth.js handles sessions. shadcn/ui components with TailwindCSS for UI. Zustand for client state. Self-contained `/modules` structure per domain.

**Tech Stack:** Next.js 15, TypeScript, Prisma, PostgreSQL, TailwindCSS, shadcn/ui, TanStack Table, React Hook Form, Zod, Zustand, NextAuth.js, Socket.io, Recharts

---

## File Structure

```
/src
├── /app
│   ├── /(auth)
│   │   ├── /login/page.tsx
│   │   └── /register/page.tsx
│   ├── /(dashboard)
│   │   ├── /dashboard/page.tsx
│   │   ├── /clients/page.tsx
│   │   ├── /quotations/page.tsx
│   │   ├── /work-orders/page.tsx
│   │   ├── /suppliers/page.tsx
│   │   ├── /purchases/page.tsx
│   │   ├── /billing/page.tsx
│   │   ├── /payments/page.tsx
│   │   ├── /reports/page.tsx
│   │   ├── /roles/page.tsx
│   │   ├── /audit-logs/page.tsx
│   │   └── /settings/page.tsx
│   ├── /api
│   │   ├── /auth/[...nextauth]/route.ts
│   │   ├── /clients/route.ts
│   │   ├── /clients/[id]/route.ts
│   │   ├── /quotations/route.ts
│   │   ├── /work-orders/route.ts
│   │   ├── /suppliers/route.ts
│   │   ├── /purchases/route.ts
│   │   ├── /billing/route.ts
│   │   ├── /payments/route.ts
│   │   ├── /roles/route.ts
│   │   └── /audit-logs/route.ts
│   ├── /layout.tsx
│   └── /page.tsx (redirect to dashboard)
├── /modules
│   ├── /auth
│   │   ├── /components/LoginForm.tsx
│   │   ├── /services/authService.ts
│   │   ├── /validations/authSchemas.ts
│   │   └── /types/auth.ts
│   ├── /dashboard
│   │   ├── /components/DashboardKPIs.tsx
│   │   ├── /components/RecentActivity.tsx
│   │   └── /services/dashboardService.ts
│   ├── /clients
│   │   ├── /components/ClientTable.tsx
│   │   ├── /components/ClientForm.tsx
│   │   ├── /services/clientService.ts
│   │   ├── /validations/clientSchemas.ts
│   │   └── /types/client.ts
│   ├── /quotations
│   ├── /work-orders
│   ├── /suppliers
│   ├── /purchases
│   ├── /billing
│   ├── /payments
│   ├── /reports
│   ├── /roles
│   ├── /audit-logs
│   └── /settings
├── /components
│   ├── /ui (shadcn components)
│   ├── /layout
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── AppShell.tsx
│   │   └── Breadcrumbs.tsx
│   ├── /tables/DataTable.tsx
│   └── /forms/FormField.tsx
├── /lib
│   ├── /prisma/prisma.ts
│   ├── /auth/auth.ts
│   ├── /auth/permissions.ts
│   ├── /validations/schemas.ts
│   └── /utils/cn.ts
├── /server
│   ├── /services
│   │   ├── clientService.ts
│   │   └── workOrderService.ts
│   └── /repositories
│       ├── clientRepository.ts
│       └── workOrderRepository.ts
├── /store
│   ├── authStore.ts
│   ├── sidebarStore.ts
│   └── notificationStore.ts
├── /hooks
│   ├── useAuth.ts
│   └── usePermissions.ts
└── /types
    ├── index.ts
    └── permissions.ts
```

---

## Task 1: Initialize Next.js Project

**Files:**
- Create: all Next.js 15 foundation files

- [ ] **Step 1: Create Next.js project**

Run: `cd /Users/francisco/Desktop/metalu && npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git --use-npm`

Expected: Project scaffolded with TypeScript, Tailwind, App Router

- [ ] **Step 2: Install core dependencies**

Run: `npm install prisma @prisma/client next-auth@beta bcryptjs zod react-hook-form @hookform/resolvers zustand @tanstack/react-table recharts socket.io socket.io-client lucide-react date-fns clsx tailwind-merge`

Run: `npm install -D @types/bcryptjs`

- [ ] **Step 3: Initialize Prisma**

Run: `npx prisma init`

- [ ] **Step 4: Configure .env**

Create `.env` with:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/metalflow?schema=public"
NEXTAUTH_SECRET="your-secret-here-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: initialize Next.js 15 project with TypeScript and Tailwind"
```

---

## Task 2: Set Up Prisma Schema

**Files:**
- Create: `prisma/schema.prisma`

- [ ] **Step 1: Write complete Prisma schema**

Write the complete schema with all models (User, Role, Permission, UserRole, Client, Quotation, QuotationItem, Supplier, WorkOrder, WorkOrderStage, WorkOrderMaterial, Purchase, PurchaseItem, Invoice, InvoiceItem, Payment, AuditLog, Notification, FileAttachment, ActivityLog).

All models include: id (UUID), createdAt, updatedAt, deletedAt (soft delete), createdById (FK).

Enums: QuotationStatus, WorkOrderStatus, Priority, StageStatus, PurchaseStatus, InvoiceType, InvoiceStatus, PaymentMethod, NotificationType.

- [ ] **Step 2: Create database**

Run: `psql -U postgres -c "CREATE DATABASE metalflow;"`

- [ ] **Step 3: Push schema to database**

Run: `npx prisma db push`

Expected: "Your database is now in sync with your Prisma schema"

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma .env && git commit -m "feat: complete Prisma schema with all ERP entities"
```

---

## Task 3: Set Up shadcn/ui Components

**Files:**
- Create: `components.json`, `src/lib/utils/cn.ts`, `/components/ui/*`

- [ ] **Step 1: Initialize shadcn/ui**

Run: `npx shadcn@latest init -y -d`

Defaults: Tailwind, CSS variables, Inter font, Zinc base color

- [ ] **Step 2: Install shadcn components**

Run: `npx shadcn@latest add button input label card table badge dialog dropdown-menu select tabs avatar popover tooltip toast form select -o`

- [ ] **Step 3: Configure tailwind.config.ts for MetalFlow colors**

Modify `tailwind.config.ts` with MetalFlow custom colors (primary: #14679C, sidebar: #2A4059, accent: #4FB5E0, background: #F1F1F1, foreground: #282828, header: #004C63, sidebar-dark: #101D2D).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: shadcn/ui setup with MetalFlow theme"
```

---

## Task 4: Authentication System (NextAuth.js v5)

**Files:**
- Create: `src/lib/auth/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/middleware.ts`
- Create: `src/modules/auth/components/LoginForm.tsx`, `src/modules/auth/validations/authSchemas.ts`, `src/modules/auth/types/auth.ts`
- Modify: `.env`

- [ ] **Step 1: Create auth configuration**

`src/lib/auth/auth.ts` — NextAuth with Credentials provider, bcrypt password checking, JWT callbacks with user id and roles.

- [ ] **Step 2: Create auth API route**

`src/app/api/auth/[...nextauth]/route.ts` — export { handlers }.

- [ ] **Step 3: Create login page**

`src/app/(auth)/login/page.tsx` — Login form with React Hook Form + Zod, signIn redirect to /dashboard.

- [ ] **Step 4: Create Zod schema**

`src/modules/auth/validations/authSchemas.ts` — LoginSchema and RegisterSchema with proper validation.

- [ ] **Step 5: Create middleware for protected routes**

`src/middleware.ts` — Redirect unauthenticated users to /login, authenticated users away from /login.

- [ ] **Step 6: Seed initial admin user**

Create seed script that creates admin user with hashed password.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: NextAuth.js authentication with credentials provider"
```

---

## Task 5: Layout System (Sidebar + Header + AppShell)

**Files:**
- Create: `src/components/layout/Sidebar.tsx`, `src/components/layout/Header.tsx`, `src/components/layout/AppShell.tsx`
- Create: `src/store/sidebarStore.ts`
- Create: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Create sidebar store**

`src/store/sidebarStore.ts` — Zustand store with isCollapsed, activeItem, toggle, setActiveItem. Export NAV_ITEMS array with all menu items.

- [ ] **Step 2: Create Sidebar component**

`src/components/layout/Sidebar.tsx` — Collapsible sidebar with NAV_ITEMS, active state highlighting, MetalFlow branding. Uses Lucide icons.

- [ ] **Step 3: Create Header component**

`src/components/layout/Header.tsx` — Top bar with search input, notification bell with badge, user dropdown, sign out button.

- [ ] **Step 4: Create AppShell**

`src/components/layout/AppShell.tsx` — Composes Sidebar + Header + main content area.

- [ ] **Step 5: Create dashboard layout**

`src/app/(dashboard)/layout.tsx` — Protected layout wrapping AppShell. Redirects to /login if no session.

- [ ] **Step 6: Update root page to redirect**

`src/app/page.tsx` — Redirects to /dashboard.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: layout system with sidebar and header"
```

---

## Task 6: Dashboard Module

**Files:**
- Create: `src/app/(dashboard)/dashboard/page.tsx`
- Create: `src/modules/dashboard/components/DashboardKPIs.tsx`, `src/modules/dashboard/components/RecentActivity.tsx`
- Create: `src/modules/dashboard/services/dashboardService.ts`

- [ ] **Step 1: Create dashboard service**

`src/modules/dashboard/services/dashboardService.ts` — getDashboardStats() queries clients count, active work orders, pending quotations, overdue invoices. getRecentActivity() returns latest activity logs.

- [ ] **Step 2: Create KPI cards**

`src/modules/dashboard/components/DashboardKPIs.tsx` — 4 KPI cards (Clientes Activos, Órdenes Activas, Cotizaciones Pendientes, Facturas Vencidas) with Lucide icons and appropriate colors.

- [ ] **Step 3: Create dashboard page**

`src/app/(dashboard)/dashboard/page.tsx` — Server component that fetches stats and renders KPIs + RecentActivity.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: dashboard with KPIs and recent activity"
```

---

## Task 7: Module Shell Generator (CRUD Templates)

**Files:**
- Create: For each module: `page.tsx`, `components/ModuleTable.tsx`, `components/ModuleForm.tsx`, `services/moduleService.ts`, `validations/moduleSchemas.ts`

Modules: clients, quotations, work-orders, suppliers, purchases, billing, payments, reports, roles, audit-logs, settings

- [ ] **Step 1: Create Clients module as template**

`src/app/(dashboard)/clients/page.tsx` — List page with DataTable.
`src/modules/clients/components/ClientTable.tsx` — TanStack Table with columns (code, name, contact, email, phone, isActive).
`src/modules/clients/components/ClientForm.tsx` — Dialog form with React Hook Form + Zod.
`src/modules/clients/services/clientService.ts` — Prisma calls (create, findMany, findUnique, update, delete).
`src/modules/clients/validations/clientSchemas.ts` — Zod schema.

- [ ] **Step 2: Create remaining module shells**

Copy same pattern for: quotations, work-orders, suppliers, purchases, billing, payments, reports, roles, audit-logs, settings.

Each module shell has: list page with table, create/edit dialog form, service layer, validation schemas.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: all module shells with CRUD templates"
```

---

## Task 8: RBAC Middleware & Permission Guards

**Files:**
- Create: `src/lib/auth/permissions.ts`, `src/hooks/usePermissions.ts`

- [ ] **Step 1: Create permissions map**

`src/lib/auth/permissions.ts` — ROLE_PERMISSIONS constant with Admin/Manager/Production/Sales/Accounting access matrix. canAccess(role, resource, action) function.

- [ ] **Step 2: Create usePermissions hook**

`src/hooks/usePermissions.ts` — usePermissions hook that checks session roles and returns can(resource, action) function.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: RBAC permission system"
```

---

## Task 9: Shared Utilities & Types

**Files:**
- Create: `src/lib/utils/cn.ts`, `src/lib/utils/formatCurrency.ts`, `src/lib/utils/formatDate.ts`, `src/types/index.ts`

- [ ] **Step 1: Create utility functions and types**

`src/lib/utils/cn.ts` — clsx + tailwind-merge utility.
`src/lib/utils/formatCurrency.ts` — Format number as currency (ARS).
`src/lib/utils/formatDate.ts` — Format date with date-fns.
`src/types/index.ts` — Global types (API response, Pagination, etc.).

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "chore: shared utilities and type definitions"
```

---

## Self-Review Checklist

1. **Spec coverage:** All items in spec Phase 1 are covered by tasks above
2. **Placeholder scan:** No TBD/TODO placeholders in task steps
3. **Type consistency:** Prisma schema field names match service layer calls

**Plan saved to:** `docs/superpowers/plans/2026-05-19-metalflow-erp-implementation.md`

---

**¿Ejecutamos con subagent-driven o inline?** Te recomiendo subagent-driven para ir más rápido — dispatch por tarea, revisión entre cada uno.