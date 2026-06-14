"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Client, QuotationSummary, InvoiceSummary } from "../types/client";
import { EncargadoListSection } from "@/modules/encargados/components/EncargadoListSection";
import {
  User,
  MapPin,
  FileText,
  DollarSign,
  Calendar,
  TrendingUp,
  Receipt,
} from "lucide-react";

const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" });
const formatDate = (d: Date | string | null) =>
  d ? new Date(d).toLocaleDateString("es-CL") : "—";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
};

export function ClientDetailModal({ open, onOpenChange, clientId }: Props) {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !clientId) {
      setClient(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/clients/${clientId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("No se pudo cargar el cliente");
        return res.json();
      })
      .then((data) => setClient(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, clientId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[var(--theme-dark)] text-lg font-bold">
            Detalle del Cliente
          </DialogTitle>
        </DialogHeader>

        {loading && <p className="text-center text-gray-500 py-8">Cargando...</p>}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {client && !loading && !error && (
          <div className="space-y-5">
            <div className="flex items-center justify-between bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-dark)] text-white px-4 py-3 rounded-lg">
              <div>
                <p className="text-xs uppercase tracking-wide opacity-80">RUT / Código</p>
                <p className="font-bold text-lg">{client.code}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide opacity-80">Estado</p>
                <Badge
                  className={
                    client.isActive
                      ? "bg-green-100 text-green-800 border-green-200"
                      : "bg-gray-100 text-gray-800 border-gray-200"
                  }
                >
                  {client.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              {/* Left column */}
              <div className="space-y-4">
                <Section icon={User} title="Datos Identificatorios">
                  <Field label="Nombre / Razón Social" value={client.name} />
                  <Field label="Giro" value={client.giro} />
                  <Field label="Contacto" value={client.contact} />
                </Section>

                <Section icon={MapPin} title="Contacto y Ubicación">
                  <Field label="Dirección" value={client.address} />
                  <Field label="Ciudad" value={client.city} />
                  <Field label="Email" value={client.email} />
                  <Field label="Teléfono" value={client.phone} />
                </Section>
              </div>

              {/* Right column */}
              <div className="space-y-4">
                <Section icon={DollarSign} title="Estado Financiero">
                  <Field label="O.C." value={client.oc} />
                  <Field label="Último Pago" value={formatDate(client.lastPaymentDate)} />
                  <Field label="Saldo Actual" value={client.currentBalance != null ? clp.format(client.currentBalance) : null} />
                </Section>

                <Section icon={Calendar} title="Auditoría">
                  <Field label="Creado" value={formatDate(client.createdAt)} />
                  <Field label="Actualizado" value={formatDate(client.updatedAt)} />
                  <Field label="Creado por" value={client.createdBy?.name} />
                </Section>
              </div>
            </div>

            {client.notes && (
              <Section icon={FileText} title="Notas">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.notes}</p>
              </Section>
            )}

            <Separator />

            <EncargadoListSection
              clientId={client.id}
              clientCode={client.code}
              clientName={client.name}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <RecentSection
                icon={TrendingUp}
                title="Últimas cotizaciones"
                empty="Sin cotizaciones aún"
                items={client.recentQuotations ?? []}
                renderItem={(q) => (
                  <QuotationRow key={q.id} q={q} />
                )}
              />
              <RecentSection
                icon={Receipt}
                title="Últimas facturas"
                empty="Sin facturas registradas"
                items={client.recentInvoices ?? []}
                renderItem={(inv) => (
                  <InvoiceRow key={inv.id} inv={inv} />
                )}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2.5 border-b flex items-center gap-2">
        <Icon className="w-4 h-4 text-[var(--theme-dark)]" />
        <span className="font-semibold text-xs text-gray-700 uppercase tracking-wide">
          {title}
        </span>
      </div>
      <div className="p-4 space-y-2.5">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-sm text-gray-800">{value || "—"}</p>
    </div>
  );
}

function RecentSection<T>({
  icon: Icon,
  title,
  empty,
  items,
  renderItem,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  empty: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2.5 border-b flex items-center gap-2">
        <Icon className="w-4 h-4 text-[var(--theme-dark)]" />
        <span className="font-semibold text-xs text-gray-700 uppercase tracking-wide">
          {title}
        </span>
      </div>
      <div className="divide-y max-h-64 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-6">{empty}</p>
        ) : (
          items.map(renderItem)
        )}
      </div>
    </div>
  );
}

function QuotationRow({ q }: { q: QuotationSummary }) {
  return (
    <div className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-gray-50">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-800 truncate">{q.number}</p>
        <p className="text-xs text-gray-500">{formatDate(q.createdAt)}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-gray-800">{clp.format(Number(q.total))}</p>
        <Badge variant="secondary" className="text-[10px]">{q.status}</Badge>
      </div>
    </div>
  );
}

function InvoiceRow({ inv }: { inv: InvoiceSummary }) {
  return (
    <div className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-gray-50">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-800 truncate">{inv.number}</p>
        <p className="text-xs text-gray-500">
          {inv.dueDate ? `Vence: ${formatDate(inv.dueDate)}` : `Emitida: ${formatDate(inv.issueDate)}`}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-gray-800">{clp.format(Number(inv.total))}</p>
        <Badge variant="secondary" className="text-[10px]">{inv.status}</Badge>
      </div>
    </div>
  );
}
