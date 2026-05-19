import { getRoles } from "@/modules/roles/services/roleService";
import { RoleTable } from "@/modules/roles/components/RoleTable";

export default async function RolesPage() {
  const roles = await getRoles();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Roles</h1>
          <p className="text-sm text-gray-500">Gestion de roles</p>
        </div>
      </div>

      <RoleTable data={roles} />
    </div>
  );
}