import { LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { getDashboardStats, getRecentActivity } from "@/modules/dashboard/services/dashboardService";
import { DashboardKPIs } from "@/modules/dashboard/components/DashboardKPIs";
import { RecentActivity } from "@/modules/dashboard/components/RecentActivity";
import { auth } from "@/lib/auth/auth";
import { isSupervisor } from "@/lib/auth/permissions";

export default async function DashboardPage() {
  const session = await auth();
  const roles = session?.user?.roles ?? [];
  const supervisor = isSupervisor(roles);

  // Supervisors see only their own OTs/quotations + their own activity.
  // Admins get the full system view. We never pass userId to admin so
  // the service stays free of role branching.
  const scope = supervisor ? { userId: session!.user.id } : undefined;

  const [stats, recentActivity] = await Promise.all([
    getDashboardStats(scope),
    getRecentActivity(10, scope),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description={supervisor ? "Tu resumen operativo" : "Resumen operativo del sistema"}
      />

      <DashboardKPIs stats={stats} scoped={supervisor} />

      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Actividad Reciente</h2>
        <RecentActivity activities={recentActivity} />
      </div>
    </div>
  );
}