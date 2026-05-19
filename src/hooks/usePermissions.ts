"use client";

import { useSession } from "next-auth/react";
import { canAccess } from "@/lib/auth/permissions";

export function usePermissions() {
  const { data: session } = useSession();
  const roles = (session?.user as any)?.roles as string[] ?? [];

  return {
    can: (resource: string, action: string) => {
      // If any role has access, grant permission
      return roles.some((role) => canAccess(role, resource, action));
    },
    hasRole: (role: string) => roles.includes(role),
  };
}