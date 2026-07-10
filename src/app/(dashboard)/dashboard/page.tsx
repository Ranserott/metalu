import { LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { getDashboardStats, getRecentActivity } from "@/modules/dashboard/services/dashboardService";
import { DashboardKPIs } from "@/modules/dashboard/components/DashboardKPIs";
import { RecentActivity } from "@/modules/dashboard/components/RecentActivity";

export default async function DashboardPage() {
  const [stats, recentActivity] = await Promise.all([
    getDashboardStats(),
    getRecentActivity(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description="Resumen operativo del sistema"
      />

      <DashboardKPIs stats={stats} />

      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Actividad Reciente</h2>
        <RecentActivity activities={recentActivity} />
      </div>
    </div>
  );
}