import { UserCog } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { getUsers } from "@/modules/users/services/userService";
import { getRoles } from "@/modules/roles/services/roleService";
import { UserTable } from "@/components/users/UserTable";
import { auth } from "@/lib/auth/auth";
import Link from "next/link";

type PrismaUserWithRoles = Awaited<ReturnType<typeof getUsers>>[number];
type Role = { id: string; name: string };

export default async function UsersPage() {
  const [users, roles, session] = await Promise.all([
    getUsers(),
    getRoles(),
    auth(),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        icon={UserCog}
        title="Usuarios"
        description="Gestión de usuarios y roles"
        actions={
          <Link
            href="/users/new"
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-white text-[var(--theme-dark)] text-sm font-medium h-8 gap-1.5 px-3 hover:bg-white/90 transition-colors"
          >
            Crear Usuario
          </Link>
        }
      />

      <UserTable
        data={users.map((u: PrismaUserWithRoles) => ({
          ...u,
          roles: u.roles.map((ur: { role: Role }) => ur.role),
        }))}
        currentUserId={session?.user?.id}
      />
    </div>
  );
}
