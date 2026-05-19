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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-gray-500">Resumen operativo del sistema</p>
      </div>

      <DashboardKPIs stats={stats} />

      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Actividad Reciente</h2>
        <RecentActivity activities={recentActivity} />
      </div>
    </div>
  );
}