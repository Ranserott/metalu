import { Users, Wrench, FileText, AlertCircle } from "lucide-react";

const KPI_CONFIG = {
  totalClients: { label: "Clientes Activos", icon: Users, color: "text-blue-600" },
  activeWorkOrders: { label: "Órdenes Activas", icon: Wrench, color: "text-orange-500" },
  pendingQuotations: { label: "Cotizaciones Pendientes", icon: FileText, color: "text-teal-600" },
  overdueInvoices: { label: "Facturas Vencidas", icon: AlertCircle, color: "text-red-500" },
};

type Stats = {
  totalClients: number;
  activeWorkOrders: number;
  pendingQuotations: number;
  overdueInvoices: number;
};

export function DashboardKPIs({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Object.entries(KPI_CONFIG).map(([key, config]) => {
        const value = stats[key as keyof Stats];
        const Icon = config.icon;
        return (
          <div key={key} className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{config.label}</p>
                <p className="text-3xl font-bold mt-1">{value}</p>
              </div>
              <Icon className={`w-10 h-10 ${config.color} opacity-50`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}