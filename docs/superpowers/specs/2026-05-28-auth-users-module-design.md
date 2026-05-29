# MetalFlow — Auth & Users Module

## Overview

Implementación del login con credentials (email + password) y un módulo de gestión de usuarios con roles para MetalFlow ERP.

---

## 1. Login Page (Mejora)

### Estado actual
El login existe pero tiene fields de email/password sin más. Se va a mejorar la UX.

### Cambios propuestos
- Mantener el diseño oscuro (fondo `#101D2D` del sidebar)
- Agregar logo/nombre de empresa "MetalFlow" más visible
- Validación en tiempo real (no solo al submit)
- Mensaje de error más descriptivo para credenciales inválidas
- Loading state en el botón mientras hace auth
- Checkbox "Recordarme" (opcional, nice-to-have)

### Tech
- No cambiar auth — ya funciona con NextAuth + Credentials
- Solo mejorar la UI del login page

---

## 2. Users Management — CRUD

### Entidad: User
```typescript
interface User {
  id: string;
  email: string;
  password: string; // hashed
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null; // soft delete
  createdById: string | null;
  roles: Role[]; // via UserRole
}
```

### Rutas y operaciones

| Método | Ruta | Descripción | Permiso |
|--------|------|-------------|---------|
| GET | `/users` | Listar usuarios activos | Admin |
| GET | `/users/new` | Formulario creación | Admin |
| POST | `/users` | Crear usuario | Admin |
| GET | `/users/[id]/edit` | Formulario edición | Admin |
| PUT | `/users/[id]` | Actualizar usuario | Admin |
| DELETE | `/users/[id]` | Soft delete (isActive=false) | Admin |
| PUT | `/users/[id]/password` | Cambiar contraseña | Admin (cualquiera) o usuario (propia) |

### Formulario de Create/Edit

**Campos:**
- `name` — text, required, max 100 chars
- `email` — email, required, unique (validar no existe en BD al editar)
- `password` — solo al crear (required) o al reset (opcional en edit)
- `isActive` — boolean, default true
- `roles` — multiselect, requerido, al menos un rol

**Validaciones:**
- Email unique (excluir el email actual al editar)
- Password min 6 chars
- Al menos un rol asignado
- No poder asignar rol "admin" a sí mismo (para evitar que el único admin se quite el acceso)

### Lista de usuarios
- Table con columnas: Nombre, Email, Roles (badges), Estado (activo/inactivo), Acciones
- Filtro por estado (todos / activos / inactivos)
- Búsqueda por nombre o email
- Ordenar por nombre, email, fecha de creación

---

## 3. Roles — Modelo de Datos

### Modelo Prisma existente (no se modifica)
```prisma
model Role {
  id        String    @id @default(uuid())
  name      String    @unique
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?
  permissions Permission[]
  users       UserRole[]
}

model UserRole {
  userId String
  roleId String
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)
  @@id([userId, roleId])
}
```

### Roles predefinidos (seeder)
- `admin` — acceso completo a gestión de usuarios y configuraciones
- `trabajador` — acceso solo a módulos de trabajo (dashboard, work orders, etc.)

### Permisos para la fase 1
No se implementa gestión granular de permisos todavía. Solo:
- Admin puede ver `/users` y todas sus operaciones
- Trabajador NO puede ver `/users` (redirect a dashboard)

---

## 4. Password Change

### Flujos

**A) Admin cambia contraseña de cualquier usuario:**
1. Admin entra a `/users/[id]/edit`
2. Ve sección "Cambiar Contraseña"
3. Ingresa nueva contraseña + confirmar
4. Guarda → se actualiza el password

**B) Usuario cambia su propia contraseña:**
1. Usuario logueado va a `/profile` (nueva ruta)
2. Ingresa contraseña actual + nueva contraseña + confirmar
3. Validaciones: contraseña actual correcta, nueva min 6 chars, confirmar coincide
4. Guarda → se actualiza el password

### Validación de password
- Mínimo 6 caracteres
- Mostrar strength indicator (opcional, nice-to-have)
- Confirmación debe coincidir

---

## 5. Seguridad

### Middleware
- Proteger `/users/**` → solo rol admin
- Proteger `/profile` → cualquier usuario autenticado

### RBAC
- `admin`: acceso a `/users`, `/dashboard`
- `trabajador`: acceso a `/dashboard`, denied `/users`

### No poder eliminarse a sí mismo
- El admin logueado no puede editarsse a sí mismo desde la lista
- Si necesita cambiar su propio rol/estado, lo hace directamente en DB (fallback)

---

## 6. UI/UX — Diseño Visual

### Meta
- Tema oscuro, colores MetalFlow
- Sidebar: `#101D2D`
- Header: `#004C63`
- Status colors: orange/blue/red/green
- Font: sistema

### Componentes reutilizables (ya existen)
- `DataTable` — para listas
- `FormField` — para inputs
- `Button` — para acciones
- `Card` — para containers
- `Badge` — para roles

### Estructura de páginas
```
/login                    → Login page (público)
/dashboard                → Dashboard (autenticado)
/users                    → Lista de usuarios (admin only)
/users/new                → Crear usuario (admin only)
/users/[id]/edit          → Editar usuario (admin only)
/profile                  → Mi perfil + cambiar password (autenticado)
```

---

## 7. Estructura de archivos

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx          # mejorado
│   ├── (dashboard)/
│   │   ├── layout.tsx              # ya existe
│   │   ├── users/
│   │   │   ├── page.tsx            # lista
│   │   │   ├── new/page.tsx        # crear
│   │   │   └── [id]/edit/page.tsx  # editar
│   │   └── profile/
│   │       └── page.tsx           # cambiar password propio
│   └── api/
│       └── users/
│           ├── route.ts            # GET, POST
│           └── [id]/
│               ├── route.ts        # PUT, DELETE
│               └── password/route.ts
├── components/
│   └── users/
│       ├── UserTable.tsx
│       └── UserForm.tsx
├── modules/
│   └── users/
│       ├── services/userService.ts  # lógica de negocio
│       ├── validations/userSchemas.ts
│       └── types/user.ts
└── lib/
    └── auth/
        └── permissions.ts          # RBAC helper
```

---

## 8. API Endpoints

### GET `/api/users`
```json
Response: { users: User[] }
```
Lista todos los usuarios activos (no incluye deletedAt).

### POST `/api/users`
```json
Body: { name, email, password, roles }
Response: { user: User } | { error: string }
```

### PUT `/api/users/[id]`
```json
Body: { name?, email?, isActive?, roles? }
Response: { user: User } | { error: string }
```

### DELETE `/api/users/[id]`
```json
Response: { success: true } | { error: string }
```
Soft delete: set `deletedAt = now()`.

### PUT `/api/users/[id]/password`
```json
Body: { password }
Response: { success: true } | { error: string }
```

### PUT `/api/profile/password`
```json
Body: { currentPassword, newPassword }
Response: { success: true } | { error: string }
```

---

## 9. Edge Cases

1. **Intentar asignar rol admin a otro usuario** → allowed (admin puede asignar admin a otros)
2. **Intentar remover todos los roles de un usuario** → rejected, al menos 1 rol requerido
3. **Email duplicado al crear** → validation error desde Prisma (unique constraint)
4. **Usuario inactivo intenta loguear** → rejected en NextAuth (isActive check)
5. **Admin intenta editarsse a sí mismo** → permitido para nombre/email, no para roles/isActive
6. **Último admin se desactiva** → warning, no permitir (al menos 1 admin activo debe existir)

---

## 10. Out of Scope (Fase 1)

- Gestión de permisos granular (resource + action)
- Email para reset password
- Audit logs de cambios
- Session management avanzada
- 2FA

---

## Estado

- [ ] Diseñar UI/UX
- [ ] Implementar login mejorado
- [ ] Crear Users module (CRUD + roles)
- [ ] Implementar password change
- [ ] Proteger rutas con RBAC
- [ ] Testing