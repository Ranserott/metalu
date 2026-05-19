"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebarStore, NAV_ITEMS } from "@/store/sidebarStore";
import { ChevronLeft, ChevronRight, LayoutDashboard, Users, FileText, Wrench, ShoppingCart, Truck, Receipt, CreditCard, BarChart3, Settings } from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  FileText,
  Wrench,
  ShoppingCart,
  Truck,
  Receipt,
  CreditCard,
  BarChart3,
  Settings,
};

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggle } = useSidebarStore();

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar-dark text-white flex flex-col transition-all duration-200 hidden md:flex",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="h-16 flex items-center justify-center border-b border-white/10">
        {!isCollapsed && (
          <span className="font-bold text-xl">MetalFlow</span>
        )}
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = ICON_MAP[item.icon] || LayoutDashboard;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm transition-colors",
                isActive
                  ? "bg-primary text-white"
                  : "text-white/70 hover:bg-white/10"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={toggle}
        className="p-4 border-t border-white/10 text-white/70 hover:text-white transition-colors"
      >
        {isCollapsed ? <ChevronRight className="w-5 h-5 mx-auto" /> : <ChevronLeft className="w-5 h-5" />}
      </button>
    </aside>
  );
}