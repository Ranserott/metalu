import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronRight, FilePen, Wrench } from "lucide-react";
import type { PendingDraftWorkOrder } from "@/modules/dashboard/services/dashboardService";

type Props = {
  drafts: PendingDraftWorkOrder[];
  totalCount: number;
};

export function PendingDraftWorkOrders({ drafts, totalCount }: Props) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FilePen className="w-5 h-5 text-yellow-600" />
          <h2 className="text-lg font-semibold">Borradores pendientes</h2>
          <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 h-6 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">
            {totalCount}
          </span>
        </div>
        <Link
          href="/work-orders"
          className="text-sm text-[var(--theme-primary)] hover:underline font-medium"
        >
          Revisar en Trabajos →
        </Link>
      </div>

      {drafts.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">
          No hay borradores pendientes de revisión.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {drafts.map((d) => (
            <li key={d.id}>
              <Link
                href="/work-orders"
                className="flex items-center gap-3 py-3 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors"
              >
                <Wrench className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    <span className="font-semibold text-[var(--theme-dark)]">{d.number}</span>
                    {" — "}
                    {d.title}
                    {d.client?.name ? (
                      <span className="text-gray-600"> · {d.client.name}</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Creado por {d.createdBy?.name ?? "—"} ·{" "}
                    {formatDistanceToNow(new Date(d.createdAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
