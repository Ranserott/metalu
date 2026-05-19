"use client";

import { usePermissions } from "@/hooks/usePermissions";

type PermissionGuardProps = {
  resource: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function PermissionGuard({ resource, action, children, fallback = null }: PermissionGuardProps) {
  const { can } = usePermissions();

  if (!can(resource, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}