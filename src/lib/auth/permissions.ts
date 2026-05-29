type Permission = {
  resource: string;
  actions: ("create" | "read" | "update" | "delete")[];
};

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  Admin: [
    { resource: "*", actions: ["create", "read", "update", "delete"] },
  ],
  Manager: [
    { resource: "dashboard", actions: ["read"] },
    { resource: "clients", actions: ["read", "update"] },
    { resource: "quotations", actions: ["read", "update"] },
    { resource: "work-orders", actions: ["create", "read", "update"] },
    { resource: "suppliers", actions: ["read", "update"] },
    { resource: "purchases", actions: ["create", "read", "update"] },
    { resource: "billing", actions: ["read", "update"] },
    { resource: "payments", actions: ["read", "update"] },
    { resource: "reports", actions: ["read"] },
    { resource: "roles", actions: ["read"] },
    { resource: "audit-logs", actions: ["read"] },
  ],
  Production: [
    { resource: "dashboard", actions: ["read"] },
    { resource: "clients", actions: ["read"] },
    { resource: "work-orders", actions: ["read", "update"] },
    { resource: "suppliers", actions: ["read"] },
    { resource: "purchases", actions: ["read"] },
  ],
  Sales: [
    { resource: "dashboard", actions: ["read"] },
    { resource: "clients", actions: ["create", "read", "update"] },
    { resource: "quotations", actions: ["create", "read", "update"] },
    { resource: "suppliers", actions: ["read"] },
    { resource: "billing", actions: ["read", "update"] },
    { resource: "reports", actions: ["read"] },
  ],
  Accounting: [
    { resource: "dashboard", actions: ["read"] },
    { resource: "clients", actions: ["read"] },
    { resource: "quotations", actions: ["read"] },
    { resource: "work-orders", actions: ["read"] },
    { resource: "suppliers", actions: ["read", "update"] },
    { resource: "purchases", actions: ["create", "read", "update"] },
    { resource: "billing", actions: ["create", "read", "update"] },
    { resource: "payments", actions: ["create", "read", "update"] },
    { resource: "reports", actions: ["read"] },
  ],
};

export function canAccess(role: string, resource: string, action: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;

  // Wildcard grants all permissions
  const wildcard = permissions.find((p) => p.resource === "*");
  if (wildcard) return wildcard.actions.includes(action as any);

  // Check specific resource permission
  const specific = permissions.find((p) => p.resource === resource);
  return specific?.actions.includes(action as any) ?? false;
}

export function isAdmin(roles: string[]): boolean {
  return roles.includes("admin");
}

export function hasAccess(roles: string[], resource: string): boolean {
  // Admin has access to everything
  if (roles.includes("admin")) return true;

  // For now, trabajadores only have access to dashboard
  if (roles.includes("trabajador") && resource === "dashboard") return true;

  return false;
}