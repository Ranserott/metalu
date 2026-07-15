import { LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  getDashboardStats,
  getPendingDraftWorkOrders,
  getRecentActivity,
} from "@/modules/dashboard/services/dashboardService";
import { DashboardKPIs } from "@/modules/dashboard/components/DashboardKPIs";
import { RecentActivity } from "@/modules/dashboard/components/RecentActivity";
import { PendingDraftWorkOrders } from "@/modules/dashboard/components/PendingDraftWorkOrders";
import { auth } from "@/lib/auth/auth";
import { isAdmin, isSupervisor } from "@/lib/auth/permissions";

export default async function DashboardPage() {
  const session = await auth();
  const roles = session?.user?.roles ?? [];
  const supervisor = isSupervisor(roles);
  const admin = !supervisor && isAdmin(roles);

  // Supervisors see only their own OTs/quotations + their own activity.
  // Admins get the full system view. We never pass userId to admin so
  // the service stays free of role branching.
  const scope = supervisor ? { userId: session!.user.id } : undefined;

  // Pending drafts section is admin-only: it's the admin's review queue
  // for work orders supervisors have saved as DRAFT.
  const [stats, recentActivity, pendingDrafts] = await Promise.all([
    getDashboardStats(scope),
    getRecentActivity(10, scope),
    admin ? getPendingDraftWorkOrders(10) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description={supervisor ? "Tu resumen operativo" : "Resumen operativo del sistema"}
      />

      <DashboardKPIs stats={stats} scoped={supervisor} />

      {admin && (
        <PendingDraftWorkOrders
          drafts={pendingDrafts}
          totalCount={stats.draftWorkOrders}
        />
      )}

      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Actividad Reciente</h2>
        <RecentActivity activities={recentActivity} />
      </div>
    </div>
  );
}