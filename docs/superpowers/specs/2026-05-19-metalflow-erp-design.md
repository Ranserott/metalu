# MetalFlow ERP — System Architecture Specification

**Date:** 2026-05-19
**Status:** Approved for Implementation
**Version:** 1.0

---

## 1. Overview

MetalFlow ERP is a professional industrial management system for a metalworking/manufacturing company. The system runs locally (LAN-only) with a central Windows server and multiple client browsers.

### 1.1 Tech Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, TailwindCSS, shadcn/ui
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL (local)
- **State:** Zustand
- **Tables:** TanStack Table
- **Forms:** React Hook Form + Zod
- **Real-time:** Socket.io
- **Charts:** Recharts
- **Auth:** NextAuth.js (Credentials provider)

### 1.2 Deployment Model

```
┌─────────────────────────────────────────┐
│  WINDOWS SERVER (PC central)            │
│  PostgreSQL :5432                       │
│  Next.js :3000                          │
│  Socket.io server                       │
│  LAN IP: 192.168.x.x (fixed)            │
└─────────────────────────────────────────┘
              │ LAN
┌──────────┬──────────┬──────────┬──────────┐
│ Client 1 │ Client 2 │ Client 3 │ Client 4 │
│ Browser  │ Browser  │ Browser  │ Browser  │
└──────────┴──────────┴──────────┴──────────┘
```

---

## 2. Project Structure

```
/src
├── /app
│   ├── /(auth)             # Login, register (public)
│   │   └── /login
│   │   └── /register
│   ├── /(dashboard)        # Protected routes
│   │   ├── /dashboard
│   │   ├── /clients
│   │   ├── /quotations
│   │   ├── /work-orders
│   │   ├── /suppliers
│   │   ├── /purchases
│   │   ├── /billing
│   │   ├── /payments
│   │   ├── /reports
│   │   ├── /roles
│   │   ├── /audit-logs
│   │   └── /settings
│   ├── /api                # API routes
│   │   ├── /auth
│   │   ├── /clients
│   │   └── ...
│   ├── /layout.tsx
│   └── /page.tsx
├── /modules                # Self-contained per module
│   ├── /auth
│   │   ├── /components    # LoginForm, etc.
│   │   ├── /services      # Auth business logic
│   │   ├── /validations   # Zod schemas
│   │   └── /types
│   ├── /dashboard
│   ├── /clients
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
│   ├── /ui                # shadcn/ui base components
│   ├── /layout            # Sidebar, Header, Breadcrumbs
│   ├── /tables            # TanStack Table wrappers
│   ├── /forms             # Form components
│   └── /charts            # Recharts wrappers
├── /lib
│   ├── /prisma            # Prisma client singleton
│   ├── /auth              # Auth utilities
│   ├── /validations       # Shared Zod schemas
│   └── /utils             # Helpers (cn, formatCurrency, etc.)
├── /server
│   ├── /services          # Business logic layer
│   ├── /repositories      # Data access layer
│   └── /middleware        # Auth middleware
├── /store                  # Zustand stores
├── /hooks                  # Custom React hooks
├── /types                  # Global TypeScript types
└── /config                 # Environment config
```

---

## 3. Database Schema (Prisma)

### 3.1 Core Models

```prisma
// All models use UUID primary keys
// All models have: createdAt, updatedAt, deletedAt (soft delete)
// All models track: createdBy (FK → User)

Model: User
├── id: UUID (PK)
├── email: String (unique)
├── password: String (hashed bcrypt)
├── name: String
├── isActive: Boolean
└── relations: roles, auditLogs, activityLogs, notifications

Model: Role
├── id: UUID (PK)
├── name: String (Admin | Manager | Production | Sales | Accounting)
└── relations: permissions, users

Model: Permission
├── id: UUID (PK)
├── resource: String (ej: "work_orders")
├── action: String (create | read | update | delete)
├── roleId: UUID (FK → Role)
└── role: Role

Model: Client
├── id: UUID (PK)
├── code: String (unique, ej: "CLI-0001")
├── name: String
├── contact, email, phone, address: String?
├── isActive: Boolean
└── relations: quotations, workOrders, invoices

Model: Quotation
├── id: UUID (PK)
├── number: String (unique, ej: "COT-2024-0001")
├── clientId: UUID (FK → Client)
├── status: Enum (DRAFT | SENT | APPROVED | REJECTED)
├── validUntil: DateTime
├── subtotal, tax, total: Decimal
├── notes: String?
├── items: QuotationItem[]
└── relations: client, createdBy, quotationItems

Model: QuotationItem
├── id: UUID (PK)
├── quotationId: UUID (FK → Quotation)
├── description, quantity, unitPrice, total: Decimal
└── quotation: Quotation

Model: Supplier
├── id: UUID (PK)
├── code, name, contact, email, phone, address: String
├── isActive: Boolean
└── relations: purchases

Model: WorkOrder
├── id: UUID (PK)
├── number: String (unique, ej: "OT-2024-0001")
├── clientId: UUID (FK → Client)
├── quotationId: UUID? (FK → Quotation)
├── title: String
├── description: String?
├── status: Enum (TODO | IN_PROGRESS | QUALITY_CHECK | COMPLETED)
├── priority: Enum (LOW | MEDIUM | HIGH | URGENT)
├── dueDate: DateTime
├── completedAt: DateTime?
├── stages: WorkOrderStage[]
├── materials: WorkOrderMaterial[]
└── relations: client, quotation, stages, materials, createdBy

Model: WorkOrderStage
├── id: UUID (PK)
├── workOrderId: UUID (FK → WorkOrder)
├── name: String (ej: "Cut", "Weld", "Paint")
├── status: Enum (PENDING | IN_PROGRESS | DONE)
├── order: Int
├── startedAt, completedAt: DateTime?
├── notes: String?
└── workOrder: WorkOrder

Model: WorkOrderMaterial
├── id: UUID (PK)
├── workOrderId: UUID (FK → WorkOrder)
├── material: String
├── quantity: Decimal
├── unit: String
├── notes: String?
└── workOrder: WorkOrder

Model: Purchase
├── id: UUID (PK)
├── number: String (unique, ej: "OC-2024-0001")
├── supplierId: UUID (FK → Supplier)
├── status: Enum (DRAFT | SENT | PARTIAL | RECEIVED | CANCELLED)
├── subtotal, tax, total: Decimal
├── items: PurchaseItem[]
└── relations: supplier, createdBy, items

Model: PurchaseItem
├── id: UUID (PK)
├── purchaseId: UUID (FK → Purchase)
├── description, quantity, unitPrice, total: Decimal
├── received: Decimal (qty received)
└── purchase: Purchase

Model: Invoice
├── id: UUID (PK)
├── number: String (unique, ej: "FAC-2024-0001")
├── clientId: UUID (FK → Client)
├── workOrderId: UUID? (FK → WorkOrder)
├── type: Enum (INVOICE | CREDIT_NOTE)
├── status: Enum (DRAFT | ISSUED | PAID | OVERDUE | CANCELLED)
├── series, numberInSeries: String/Int
├── issueDate, dueDate: DateTime
├── subtotal, tax, total: Decimal
├── paidAt: DateTime?
├── items: InvoiceItem[]
├── payments: Payment[]
└── relations: client, workOrder, createdBy, items, payments

Model: InvoiceItem
├── id: UUID (PK)
├── invoiceId: UUID (FK → Invoice)
├── description, quantity, unitPrice, total: Decimal
└── invoice: Invoice

Model: Payment
├── id: UUID (PK)
├── number: String (unique)
├── invoiceId: UUID (FK → Invoice)
├── amount: Decimal
├── method: Enum (CASH | BANK_TRANSFER | CHECK | CARD)
├── reference: String?
├── date: DateTime
├── notes: String?
├── createdBy: UUID (FK → User)
└── relations: invoice, createdBy

Model: AuditLog
├── id: UUID (PK)
├── userId: UUID (FK → User)
├── action: String (CREATE | UPDATE | DELETE | LOGIN | LOGOUT)
├── resource: String
├── resourceId: UUID
├── oldValues, newValues: Json?
├── ipAddress, userAgent: String?
└── relations: user

Model: Notification
├── id: UUID (PK)
├── userId: UUID (FK → User)
├── type: Enum (INFO | WARNING | ERROR | SUCCESS)
├── title, message: String
├── isRead: Boolean
├── link: String?
└── relations: user

Model: FileAttachment
├── id: UUID (PK)
├── fileName, originalName, mimeType: String
├── size: Int
├── url: String
├── entityType: String (WorkOrder | Quotation | Invoice | etc.)
├── entityId: UUID
├── uploadedBy: UUID (FK → User)
└── relations: uploadedByUser

Model: ActivityLog
├── id: UUID (PK)
├── userId: UUID (FK → User)
├── entityType, entityId: String/UUID
├── action, details: String
└── relations: user
```

---

## 4. Authentication & Authorization

### 4.1 Auth Flow

- NextAuth.js with Credentials provider
- JWT stored in httpOnly cookies
- bcrypt password hashing (12 rounds)
- Session includes: userId, email, name, role

### 4.2 RBAC Permissions Matrix

| Resource | Admin | Manager | Production | Sales | Accounting |
|----------|-------|---------|------------|-------|------------|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Clients | CRUD | RU | R | CRU | R |
| Quotations | CRUD | RU | — | CRU | R |
| Work Orders | CRUD | CRU | RU | — | R |
| Suppliers | CRUD | RU | R | R | RU |
| Purchases | CRUD | CRU | R | — | CRU |
| Billing | CRUD | RU | — | RU | CRU |
| Payments | CRUD | RU | — | — | CRU |
| Reports | ✓ | ✓ | — | R | ✓ |
| Roles | CRUD | R | — | — | — |
| Audit Logs | ✓ | R | — | — | — |

---

## 5. UI Design System

### 5.1 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| primary | #14679C | Brand buttons, links |
| sidebar | #2A4059 | Dark sidebar background |
| accent | #4FB5E0 | Highlights, active states |
| background | #F1F1F1 | Main content background |
| text | #282828 | Primary text |
| header | #004C63 | Top header bar (from ref) |
| sidebar-dark | #101D2D | Sidebar (from ref) |

**Status Colors:**
- Orange: TODO / Pending
- Blue: IN_PROGRESS / Active
- Red: QUALITY_CHECK / Issue
- Green: COMPLETED / Done

### 5.2 Layout Structure

```
┌──────────────────────────────────────────────────────────────┐
│ HEADER (#004C63)                                            │
│ [Logo]  🔍 Search...   🔔 Notifications  👤 User ▼          │
├────────────┬────────────────────────────────────────────────┤
│ SIDEBAR    │  MAIN CONTENT (#F4F7F9)                        │
│ (#101D2D)  │                                                │
│            │  ┌─ Module Header ─────────────────────────┐   │
│ Dashboard  │  │ Title   [+ New]  [Filters] [View ▼]    │   │
│ Clients    │  └────────────────────────────────────────┘   │
│ Quotations │                                                │
│ Work Orders│  ┌─ Content Area ──────────────────────────┐   │
│ Purchases  │  │ Table / Kanban / Cards / Form          │   │
│ Suppliers  │  │                                        │   │
│ Billing    │  │                                        │   │
│ Payments   │  └────────────────────────────────────────┘   │
│ Reports    │                                                │
│ Settings   │                                                │
│            │                                                │
│ ────────── │                                                │
│ User Info  │                                                │
└────────────┴────────────────────────────────────────────────┘
```

---

## 6. Implementation Phases

### Phase 1 — Foundation (CURRENT)
- [ ] Next.js 15 + TypeScript + App Router
- [ ] TailwindCSS + shadcn/ui installation
- [ ] Prisma schema + PostgreSQL setup
- [ ] NextAuth.js authentication
- [ ] Layout (Sidebar + Header + Main)
- [ ] Dashboard (KPIs wired to mock data)
- [ ] All module shells (CRUD skeletons)
- [ ] RBAC middleware
- [ ] Zod validation layer

### Phase 2 — Core Modules
- [ ] Work Orders full (Kanban + Table)
- [ ] Quotations + PDF export
- [ ] Clients CRUD

### Phase 3 — Business Flow
- [ ] Purchases + receiving
- [ ] Invoicing + payments
- [ ] Suppliers CRUD

### Phase 4 — Advanced
- [ ] Reports + charts
- [ ] Real-time notifications (Socket.io)
- [ ] File attachments
- [ ] Audit logs UI
- [ ] Desktop wrapper (Electron/Tauri)

---

## 7. API Design

All API routes follow REST conventions:

```
GET    /api/[resource]           # List (with pagination, filters)
POST   /api/[resource]           # Create
GET    /api/[resource]/:id       # Read one
PATCH  /api/[resource]/:id        # Update
DELETE /api/[resource]/:id       # Soft delete

GET    /api/[resource]/:id/logs  # Activity logs for resource
POST   /api/[resource]/:id/files # Upload file
```

Response format:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

Error format:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": { ... }
  }
}
```

---

## 8. Key Conventions

### 8.1 Code Organization
- Modules are self-contained (components + services + types + validations)
- Shared components in `/components/ui` and `/components/layout`
- Server logic in `/server/services` and `/server/repositories`
- Zustand stores per domain

### 8.2 Naming
- Components: PascalCase (UserTable, ClientForm)
- Hooks: camelCase with "use" prefix (useClients, useWorkOrders)
- Services: camelCase (clientService, workOrderService)
- API routes: kebab-case (/work-orders, /audit-logs)

### 8.3 Validation
- Zod schemas for all inputs
- React Hook Form integration
- Server-side validation middleware

---

*This spec is the source of truth. All implementation must match this document.*