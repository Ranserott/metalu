"use client";

import { Bell, Search, User, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="h-16 bg-[var(--theme-darker)] text-white flex items-center justify-between px-6">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full bg-white/10 rounded-md pl-10 pr-4 py-2 text-sm placeholder:text-white/50 focus:outline-none focus:bg-white/20 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 hover:bg-white/10 rounded-md transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="flex items-center gap-2">
          <User className="w-5 h-5" />
          <span className="text-sm">{session?.user?.name || "Usuario"}</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Salir
        </button>
      </div>
    </header>
  );
}