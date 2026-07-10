"use client";

import { useEffect, useState, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { WorkOrderReportFilters } from "./WorkOrderReportFilters";
import { ByClientTab } from "./tabs/ByClientTab";
import { ByWorkOrderTab } from "./tabs/ByWorkOrderTab";
import type {
  ClientOption,
  EncargadoOption,
  LocalOption,
  WorkOrderReportFilters as Filters,
  WorkOrderReportType,
  ByClientGroup,
  ByClientTotals,
  ByWorkOrderRow,
  ByWorkOrderTotals,
} from "../types/report";

const TAB_LABELS: Record<WorkOrderReportType, string> = {
  "by-client": "Trabajos por cliente",
  "by-workorder": "Lista trabajos",
};

type Props = {
  clients: ClientOption[];
  locales: LocalOption[];
  encargados: EncargadoOption[];
};

export function ReportsView({ clients, locales, encargados }: Props) {
  const [activeTab, setActiveTab] = useState<WorkOrderReportType>("by-client");
  const [filters, setFilters] = useState<Filters>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [byClientGroups, setByClientGroups] = useState<ByClientGroup[]>([]);
  const [byClientTotals, setByClientTotals] = useState<ByClientTotals | undefined>(undefined);

  const [byWorkOrderRows, setByWorkOrderRows] = useState<ByWorkOrderRow[]>([]);
  const [byWorkOrderTotals, setByWorkOrderTotals] = useState<ByWorkOrderTotals | undefined>(
    undefined
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ type: activeTab });
      const filterKey = activeTab === "by-client"
        ? ["clientId", "local", "encargadoId", "facturado", "nroFactura", "nroGuia", "nroOrdenCompra", "from", "to"] as const
        : ["from", "to", "local", "status", "description", "nroFactura", "nroGuia", "number"] as const;

      for (const key of filterKey) {
        const value = filters[key];
        if (value !== undefined && value !== "" && value !== "all") {
          params.set(key, String(value));
        }
      }

      const res = await fetch(`/api/work-orders/reports?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error ${res.status}`);
      }
      const data = await res.json();

      if (activeTab === "by-client") {
        setByClientGroups(data.groups ?? []);
        setByClientTotals(data.totals);
      } else {
        setByWorkOrderRows(data.rows ?? []);
        setByWorkOrderTotals(data.totals);
      }
    } catch (e: any) {
      setError(e.message ?? "Error al cargar");
      if (activeTab === "by-client") {
        setByClientGroups([]);
        setByClientTotals(undefined);
      } else {
        setByWorkOrderRows([]);
        setByWorkOrderTotals(undefined);
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleTabChange(next: string) {
    setActiveTab(next as WorkOrderReportType);
    setError(null);
    // Wipe stale data so a tab never renders the other tab's shape.
    setByClientGroups([]);
    setByClientTotals(undefined);
    setByWorkOrderRows([]);
    setByWorkOrderTotals(undefined);
  }

  function handleFiltersChange(next: Filters) {
    setFilters(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Informes de trabajos</h1>
          <p className="text-sm text-gray-500">
            Listado de trabajos por cliente o por filtros generales
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          {(Object.keys(TAB_LABELS) as WorkOrderReportType[]).map((t) => (
            <TabsTrigger key={t} value={t}>
              {TAB_LABELS[t]}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-4">
          <WorkOrderReportFilters
            activeTab={activeTab}
            clients={clients}
            locales={locales}
            encargados={encargados}
            filters={filters}
            onChange={handleFiltersChange}
          />
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <TabsContent value="by-client" className="mt-4">
          <ByClientTab
            groups={byClientGroups}
            totals={byClientTotals}
            loading={loading}
          />
        </TabsContent>
        <TabsContent value="by-workorder" className="mt-4">
          <ByWorkOrderTab
            rows={byWorkOrderRows}
            totals={byWorkOrderTotals}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}