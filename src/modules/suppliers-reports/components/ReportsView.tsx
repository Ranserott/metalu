"use client";

import { useEffect, useState, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SupplierReportFilters } from "./SupplierReportFilters";
import { ByDueDateTab } from "./tabs/ByDueDateTab";
import { BySupplierTab } from "./tabs/BySupplierTab";
import { DailySummaryTab } from "./tabs/DailySummaryTab";
import type {
  SupplierOption,
  SupplierReportType,
  SupplierDocByDueDateRow,
  SupplierDocByDueDateTotals,
  SupplierDocBySupplierRow,
  SupplierDocBySupplierTotals,
  DailySummaryRow,
  DailySummaryTotals,
} from "../types/report";

const TAB_LABELS: Record<SupplierReportType, string> = {
  "by-due-date": "Por pagar x fecha",
  "by-supplier": "Por pagar x proveedor",
  "daily-summary": "Resumen x día",
};

type Props = {
  suppliers: SupplierOption[];
};

export function ReportsView({ suppliers }: Props) {
  const [activeTab, setActiveTab] = useState<SupplierReportType>("by-due-date");
  const [supplierId, setSupplierId] = useState<string | undefined>(undefined);
  const [from, setFrom] = useState<string | undefined>(undefined);
  const [to, setTo] = useState<string | undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>(undefined);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ type: activeTab });
      if (supplierId) params.set("supplierId", supplierId);
      if (from) params.set("from", new Date(from).toISOString());
      if (to) params.set("to", new Date(to).toISOString());

      const res = await fetch(`/api/suppliers/reports?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error ${res.status}`);
      }
      const data = await res.json();
      setRows(data.rows ?? []);
      setTotals(data.totals);
    } catch (e: any) {
      setError(e.message ?? "Error al cargar");
      setRows([]);
      setTotals(undefined);
    } finally {
      setLoading(false);
    }
  }, [activeTab, supplierId, from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleTabChange(next: string) {
    setActiveTab(next as SupplierReportType);
    setError(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Reportes de proveedores</h1>
          <p className="text-sm text-gray-500">Documentos por pagar y resumen diario</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          {(Object.keys(TAB_LABELS) as SupplierReportType[]).map((t) => (
            <TabsTrigger key={t} value={t}>
              {TAB_LABELS[t]}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-4">
          <SupplierReportFilters
            suppliers={suppliers}
            supplierId={supplierId}
            from={from}
            to={to}
            onSupplierChange={setSupplierId}
            onFromChange={setFrom}
            onToChange={setTo}
          />
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <TabsContent value="by-due-date" className="mt-4">
          <ByDueDateTab
            rows={rows as SupplierDocByDueDateRow[]}
            totals={totals as SupplierDocByDueDateTotals | undefined}
            loading={loading}
          />
        </TabsContent>
        <TabsContent value="by-supplier" className="mt-4">
          <BySupplierTab
            rows={rows as SupplierDocBySupplierRow[]}
            totals={totals as SupplierDocBySupplierTotals | undefined}
            loading={loading}
          />
        </TabsContent>
        <TabsContent value="daily-summary" className="mt-4">
          <DailySummaryTab
            rows={rows as DailySummaryRow[]}
            totals={totals as DailySummaryTotals | undefined}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
