"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Download, Loader2 } from "lucide-react";
import { supplierReportFilename } from "../utils/filename";
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
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>(undefined);

  // Selection state — owns the ids of documents the admin has ticked.
  // Cleared on tab change so a bulk action can never straddle tabs by accident.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMarking, setBulkMarking] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      if (allSelected) return new Set();
      return new Set([...prev, ...ids]);
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  async function handleBulkMarkPaid() {
    const ids = [...selectedIds];
    if (ids.length === 0 || bulkMarking) return;
    setBulkMarking(true);
    try {
      const res = await fetch("/api/suppliers/documents/paid", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? `Error ${res.status}`);
        return;
      }
      toast.success(
        data.updated === ids.length
          ? `${data.updated} documento(s) marcados como pagados`
          : `${data.updated} marcados (${ids.length - data.updated} ya estaban pagados)`
      );
      clearSelection();
      // Refetch the active tab so the just-paid rows vanish from the report
      // (supplierReportService filters by estado: "PENDIENTE").
      await fetchData();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo marcar");
    } finally {
      setBulkMarking(false);
    }
  }

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

  const canExport = !loading && !error && rows.length > 0;

  function handleTabChange(next: string) {
    setActiveTab(next as SupplierReportType);
    setError(null);
    // Clear stale rows/totals so a tab never renders with the previous tab's shape
    // (e.g. daily-summary totals would otherwise keep by-due-date's {total} and crash on .pendiente.total).
    setRows([]);
    setTotals(undefined);
    // Clear selection to avoid stranding ids from a previous tab.
    clearSelection();
  }

  async function handleExportPdf() {
    if (!canExport || exporting) return;
    setExporting(true);
    try {
      const params = new URLSearchParams({ type: activeTab });
      if (supplierId) params.set("supplierId", supplierId);
      if (from) params.set("from", new Date(from).toISOString());
      if (to) params.set("to", new Date(to).toISOString());

      const res = await fetch(`/api/suppliers/reports/pdf?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = supplierReportFilename(activeTab);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message ?? "Error al generar el PDF");
    } finally {
      setExporting(false);
    }
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

        <div className="mt-4 flex justify-end gap-2">
          {activeTab !== "daily-summary" && (
            <Button
              type="button"
              onClick={handleBulkMarkPaid}
              disabled={selectedIds.size === 0 || bulkMarking}
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
            >
              {bulkMarking ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Marcar {selectedIds.size} como pagados
            </Button>
          )}
          <Button
            type="button"
            onClick={handleExportPdf}
            disabled={!canExport || exporting}
            title={canExport ? "Descargar PDF" : "No hay datos para exportar"}
            className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-dark)] hover:from-[var(--theme-dark)] hover:to-[var(--theme-darker)] text-white"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Exportar PDF
          </Button>
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
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleSelectAll}
          />
        </TabsContent>
        <TabsContent value="by-supplier" className="mt-4">
          <BySupplierTab
            rows={rows as SupplierDocBySupplierRow[]}
            totals={totals as SupplierDocBySupplierTotals | undefined}
            loading={loading}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleSelectAll}
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
