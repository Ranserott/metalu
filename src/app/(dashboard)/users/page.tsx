import { getUsers } from "@/modules/users/services/userService";
import { getRoles } from "@/modules/roles/services/roleService";
import { UserTable } from "@/components/users/UserTable";
import Link from "next/link";

type PrismaUserWithRoles = Awaited<ReturnType<typeof getUsers>>[number];
type Role = { id: string; name: string };

export default async function UsersPage() {
  const [users, roles] = await Promise.all([getUsers(), getRoles()]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-sm text-gray-500">Gestión de usuarios y roles</p>
        </div>
        <Link
          href="/users/new"
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-primary text-primary-foreground text-sm font-medium h-8 gap-1.5 px-2.5 hover:bg-primary/80 transition-colors"
        >
          Crear Usuario
        </Link>
      </div>

      <UserTable
        data={users.map((u: PrismaUserWithRoles) => ({
          ...u,
          roles: u.roles.map((ur: { role: Role }) => ur.role),
        }))}
      />
    </div>
  );
}
