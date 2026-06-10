import { create } from "zustand";
import { persist } from "zustand/middleware";

type NavItem = {
  label: string;
  href: string;
  icon: string;
  roles?: string[];
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Clientes", href: "/clients", icon: "Users" },
  { label: "Cotizaciones", href: "/quotations", icon: "FileText" },
  { label: "Órdenes de Trabajo", href: "/work-orders", icon: "Wrench" },
  { label: "Compras", href: "/purchases", icon: "ShoppingCart" },
  { label: "Proveedores", href: "/suppliers", icon: "Truck", roles: ["Admin", "Manager", "Production"] },
  { label: "Facturación", href: "/billing", icon: "Receipt", roles: ["Admin", "Manager", "Sales", "Accounting"] },
  { label: "Pagos", href: "/payments", icon: "CreditCard", roles: ["Admin", "Manager", "Accounting"] },
  { label: "Informes", href: "/reports", icon: "BarChart3" },
  { label: "Configuración", href: "/settings", icon: "Settings" },
  { label: "Usuarios", href: "/users", icon: "Users", roles: ["Admin"] },
];

export function getVisibleNavItems(userRoles: string[]): NavItem[] {
  return NAV_ITEMS.filter(item =>
    !item.roles || item.roles.some(role => userRoles.includes(role))
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
