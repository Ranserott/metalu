import { create } from "zustand";
import { persist } from "zustand/middleware";
import { canAccess, isAdmin } from "@/lib/auth/permissions";

type NavItem = {
  label: string;
  href: string;
  icon: string;
  resource: string; // single source of truth — drives visibility
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", resource: "dashboard" },
  { label: "Clientes", href: "/clients", icon: "Users", resource: "clients" },
  { label: "Cotizaciones", href: "/quotations", icon: "FileText", resource: "quotations" },
  { label: "Órdenes de Trabajo", href: "/work-orders", icon: "Wrench", resource: "work-orders" },
  { label: "Compras", href: "/purchases", icon: "ShoppingCart", resource: "purchases" },
  { label: "Proveedores", href: "/suppliers", icon: "Truck", resource: "suppliers" },
  { label: "Facturación", href: "/billing", icon: "Receipt", resource: "billing" },
  { label: "Pagos", href: "/payments", icon: "CreditCard", resource: "payments" },
  { label: "Informes", href: "/reports", icon: "BarChart3", resource: "reports" },
  { label: "Configuración", href: "/settings", icon: "Settings", resource: "settings" },
  { label: "Usuarios", href: "/users", icon: "Users", resource: "users" },
];

export function getVisibleNavItems(userRoles: string[]): NavItem[] {
  if (isAdmin(userRoles)) return NAV_ITEMS;
  return NAV_ITEMS.filter((item) =>
    userRoles.some((role) => canAccess(role, item.resource, "read")),
  );
}

export const useSidebarStore = create(
  persist(
    (set) => ({
      isCollapsed: false,
      toggle: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
    }),
    { name: "metalflow-sidebar" }
  )
);

export { NAV_ITEMS };