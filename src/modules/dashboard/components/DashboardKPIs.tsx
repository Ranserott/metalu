import { Users, Wrench, FileText, AlertCircle } from "lucide-react";

type KPIKey = "totalClients" | "activeWorkOrders" | "pendingQuotations" | "overdueInvoices";

type KPIConfigEntry = {
  label: string;
  scopedLabel?: string;
  icon: typeof Users;
  color: string;
};

const KPI_CONFIG: Record<KPIKey, KPIConfigEntry> = {
  totalClients: { label: "Clientes Activos", icon: Users, color: "text-blue-600" },
  activeWorkOrders: {
    label: "Órdenes Activas",
    scopedLabel: "Mis OTs activas",
    icon: Wrench,
    color: "text-orange-500",
  },
  pendingQuotations: {
    label: "Cotizaciones Pendientes",
    scopedLabel: "Mis Cotizaciones pendientes",
    icon: FileText,
    color: "text-teal-600",
  },
  overdueInvoices: { label: "Facturas Vencidas", icon: AlertCircle, color: "text-red-500" },
};

// Supervisors see only OTs + Quotations (their own). The global totals
// (clients, invoices) don't apply to their world, so we hide them.
const SCOPED_VISIBLE_KEYS: KPIKey[] = ["activeWorkOrders", "pendingQuotations"];

type Stats = {
  totalClients?: number;
  activeWorkOrders: number;
  pendingQuotations: number;
  overdueInvoices?: number;
};

type Props = {
  stats: Stats;
  /**
   * True when the viewer is a supervisor. Switches the layout to a
   * 2-card personal view (Mis OTs / Mis Cotizaciones) and hides the
   * global totals. Defaults to admin / full view.
   */
  scoped?: boolean;
};

export function DashboardKPIs({ stats, scoped = false }: Props) {
  const keys: KPIKey[] = scoped
    ? SCOPED_VISIBLE_KEYS
    : ["totalClients", "activeWorkOrders", "pendingQuotations", "overdueInvoices"];

  const gridCols = scoped ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={`grid grid-cols-1 ${gridCols} gap-4`}>
      {keys.map((key) => {
        const config = KPI_CONFIG[key];
        const value = stats[key] ?? 0;
        const Icon = config.icon;
        const label = scoped && config.scopedLabel ? config.scopedLabel : config.label;
        return (
          <div key={key} className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
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