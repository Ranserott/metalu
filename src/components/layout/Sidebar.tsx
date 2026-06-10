"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useSidebarStore, getVisibleNavItems } from "@/store/sidebarStore";
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
  const { data: session } = useSession();
  const { isCollapsed, toggle } = useSidebarStore();

  const userRoles = (session?.user as any)?.roles as string[] ?? [];
  const visibleNavItems = getVisibleNavItems(userRoles);

  return (
    <aside
      className={cn(
        "h-screen bg-[var(--theme-dark)] text-white flex flex-col transition-all duration-200 hidden md:flex",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="h-20 flex items-center justify-center border-b border-white/10">
        {!isCollapsed && (
          <span className="font-bold text-2xl tracking-tight">Metalurgica</span>
        )}
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP] || LayoutDashboard;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-base font-medium transition-colors",
                isActive
                  ? "bg-[var(--theme-primary)] text-white"
                  : "text-white/80 hover:bg-white/10"
              )}
            >
              <Icon className="w-6 h-6 shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={toggle}
        className="h-16 border-t border-white/10 text-white/70 hover:text-white transition-colors flex items-center justify-center hover:bg-white/5"
      >
        {isCollapsed ? (
          <ChevronRight className="w-6 h-6" />
        ) : (
          <ChevronLeft className="w-6 h-6" />
        )}
      </button>
    </aside>
  );
}
