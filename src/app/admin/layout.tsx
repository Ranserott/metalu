import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.roles.includes("Admin")) redirect("/");

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 border-r bg-gray-50 p-4">
        <h2 className="mb-4 text-lg font-semibold">Admin</h2>
        <nav className="flex flex-col gap-2 text-sm">
          <a href="/admin" className="hover:underline">Dashboard</a>
          <a href="/admin/server-info" className="hover:underline">Server Info</a>
          <a href="/admin/backups" className="hover:underline">Backups</a>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
