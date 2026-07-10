import { Shield } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { getRoles } from "@/modules/roles/services/roleService";
import { RoleTable } from "@/modules/roles/components/RoleTable";

export default async function RolesPage() {
  const roles = await getRoles();

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Shield}
        title="Roles"
        description="Gestión de roles"
      />

      <RoleTable data={roles} />
    </div>
  );
}