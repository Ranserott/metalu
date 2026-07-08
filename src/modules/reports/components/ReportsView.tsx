"use client";

import { useEffect, useState, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ReportFilters, type ClientOption } from "./ReportFilters";
import { CartolaTab } from "./tabs/CartolaTab";
import { PendingInvoicesTab } from "./tabs/PendingInvoicesTab";
import { SalesTab } from "./tabs/SalesTab";
import { PaymentsTab } from "./tabs/PaymentsTab";
import { CreditNotesTab } from "./tabs/CreditNotesTab";
import { BalancesTab } from "./tabs/BalancesTab";
import type { ReportType } from "../types/report";

const TEMPORAL_TABS: ReportType[] = ["sales", "payments", "credit-notes", "cartola"];

const TAB_LABELS: Record<ReportType, string> = {
  cartola: "Cartola Clientes",
  "pending-invoices": "Facturas Pendientes",
  sales: "Ventas",
  payments: "Pagos",
  "credit-notes": "Notas Crédito",
  balances: "Saldos",
};

type Props = {
  clients: ClientOption[];
};

export function ReportsView({ clients }: Props) {
  const [activeTab, setActiveTab] = useState<ReportType>("cartola");
  const [clientId, setClientId] = useState<string | undefined>(undefined);
  const [from, setFrom] = useState<string | undefined>(undefined);
  const [to, setTo] = useState<string | undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>(undefined);

  const showDateRange = TEMPORAL_TABS.includes(activeTab);
  const clientRequired = activeTab === "cartola";
  const canFetch = !clientRequired || !!clientId;

  const fetchData = useCallback(async () => {
    if (!canFetch) {
      setRows([]);
      setTotals(undefined);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ type: activeTab });
      if (clientId) params.set("clientId", clientId);
      if (from) params.set("from", new Date(from).toISOString());
      if (to) params.set("to", new Date(to).toISOString());

      const res = await fetch(`/api/reports?${params.toString()}`);
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
  }, [activeTab, clientId, from, to, canFetch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleTabChange(next: string) {
    setActiveTab(next as ReportType);
    setError(null);
  }

  function handleClientChange(value: string | undefined) {
    setClientId(value);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Reportes</h1>
          <p className="text-sm text-gray-500">Módulo de informes</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          {(Object.keys(TAB_LABELS) as ReportType[]).map((t) => (
            <TabsTrigger key={t} value={t}>
              {TAB_LABELS[t]}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-4">
          <ReportFilters
            clients={clients}
            clientId={clientId}
            from={from}
            to={to}
            showDateRange={showDateRange}
            clientRequired={clientRequired}
            onClientChange={handleClientChange}
            onFromChange={setFrom}
            onToChange={setTo}
          />
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {(Object.keys(TAB_LABELS) as ReportType[]).map((t) => (
          <TabsContent key={t} value={t} className="mt-4">
            {t === "cartola" && (
              <CartolaTab rows={rows} totals={totals} loading={loading} clientSelected={!!clientId} />
            )}
            {t === "pending-invoices" && (
              <PendingInvoicesTab rows={rows} totals={totals} loading={loading} />
            )}
            {t === "sales" && (
              <SalesTab rows={rows} totals={totals} loading={loading} />
            )}
            {t === "payments" && (
              <PaymentsTab rows={rows} totals={totals} loading={loading} />
            )}
            {t === "credit-notes" && (
              <CreditNotesTab rows={rows} totals={totals} loading={loading} />
            )}
            {t === "balances" && (
              <BalancesTab rows={rows} totals={totals} loading={loading} />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}