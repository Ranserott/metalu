import { create } from "zustand";

type NavItem = {
  label: string;
  href: string;
  icon: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Clientes", href: "/clients", icon: "Users" },
  { label: "Cotizaciones", href: "/quotations", icon: "FileText" },
  { label: "Órdenes de Trabajo", href: "/work-orders", icon: "Wrench" },
  { label: "Compras", href: "/purchases", icon: "ShoppingCart" },
  { label: "Proveedores", href: "/suppliers", icon: "Truck" },
  { label: "Facturación", href: "/billing", icon: "Receipt" },
  { label: "Pagos", href: "/payments", icon: "CreditCard" },
  { label: "Informes", href: "/reports", icon: "BarChart3" },
  { label: "Configuración", href: "/settings", icon: "Settings" },
];

export const useSidebarStore = create<{
  isCollapsed: boolean;
  activeItem: string;
  toggle: () => void;
  setActiveItem: (item: string) => void;
}>((set) => ({
  isCollapsed: false,
  activeItem: "/dashboard",
  toggle: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  setActiveItem: (item) => set({ activeItem: item }),
}));

export { NAV_ITEMS };