import { prisma } from "@/lib/prisma/prisma";
import type {
  CartolaRow,
  PendingInvoiceRow,
  SaleRow,
  PaymentRow,
  CreditNoteRow,
  BalanceRow,
  ReportType,
} from "../types/report";

const toNumber = (v: unknown): number => (v == null ? 0 : Number(v));

export type CartolaFilters = { clientId: string; from?: Date; to?: Date };
export type PendingFilters = { clientId?: string; from?: Date; to?: Date };
export type SalesFilters = { clientId?: string; from?: Date; to?: Date };
export type PaymentsFilters = { clientId?: string; from?: Date; to?: Date };
export type CreditNotesFilters = { clientId?: string; from?: Date; to?: Date };
export type BalancesFilters = { clientId?: string };

async function getInvoiceSaldo(invoiceId: string): Promise<number> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { total: true },
  });
  if (!invoice) return 0;
  const agg = await prisma.payment.aggregate({
    where: { invoiceId, status: "PAGADO", deletedAt: null },
    _sum: { amount: true },
  });
  return toNumber(invoice.total) - toNumber(agg._sum.amount);
}

export async function getCartola(filters: CartolaFilters): Promise<{
  rows: CartolaRow[];
  totals: { cargos: number; abonos: number; saldoFinal: number };
}> {
  const { clientId, from, to } = filters;

  const invoiceWhere: any = { clientId, deletedAt: null };
  const paymentWhere: any = { invoice: { clientId }, deletedAt: null, status: "PAGADO" };
  if (from || to) {
    invoiceWhere.issueDate = {};
    paymentWhere.date = {};
    if (from) {
      invoiceWhere.issueDate.gte = from;
      paymentWhere.date.gte = from;
    }
    if (to) {
      invoiceWhere.issueDate.lte = to;
      paymentWhere.date.lte = to;
    }
  }

  const [invoices, payments] = await Promise.all([
    prisma.invoice.findMany({
      where: invoiceWhere,
      select: {
        id: true,
        number: true,
        type: true,
        issueDate: true,
        total: true,
        workOrderId: true,
      },
      orderBy: { issueDate: "asc" },
    }),
    prisma.payment.findMany({
      where: paymentWhere,
      select: {
        id: true,
        number: true,
        date: true,
        amount: true,
        method: true,
        reference: true,
      },
      orderBy: { date: "asc" },
    }),
  ]);

  type Movement = {
    date: Date;
    type: CartolaRow["type"];
    documentNumber: string;
    detail: string;
    charge: number;
    payment: number;
  };

  const movements: Movement[] = [
    ...invoices.map((inv) => ({
      date: inv.issueDate,
      type: inv.type === "CREDIT_NOTE" ? ("NOTA CREDITO" as const) : ("FACTURA" as const),
      documentNumber: inv.number,
      detail:
        inv.type === "CREDIT_NOTE"
          ? `NC ${inv.number}${inv.workOrderId ? ` (OT ${inv.workOrderId.slice(0, 8)})` : ""}`
          : `Factura ${inv.number}${inv.workOrderId ? ` - OT ${inv.workOrderId.slice(0, 8)}` : ""}`,
      charge: toNumber(inv.total),
      payment: 0,
    })),
    ...payments.map((pay) => ({
      date: pay.date,
      type: "PAGO" as const,
      documentNumber: pay.number,
      detail: pay.reference || `Pago ${pay.method}`,
      charge: 0,
      payment: toNumber(pay.amount),
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  let running = 0;
  let cargos = 0;
  let abonos = 0;
  const rows: CartolaRow[] = movements.map((m) => {
    running += m.charge - m.payment;
    cargos += m.charge;
    abonos += m.payment;
    return { ...m, balance: running };
  });

  return { rows, totals: { cargos, abonos, saldoFinal: running } };
}

export async function getPendingInvoices(filters: PendingFilters): Promise<{
  rows: PendingInvoiceRow[];
  totals: { saldo: number };
}> {
  const where: any = {
    status: { in: ["ISSUED", "OVERDUE"] },
    deletedAt: null,
  };
  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.from || filters.to) {
    where.issueDate = {};
    if (filters.from) where.issueDate.gte = filters.from;
    if (filters.to) where.issueDate.lte = filters.to;
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      client: { select: { name: true } },
      payments: { where: { status: "PAGADO", deletedAt: null }, select: { amount: true } },
    },
    orderBy: { issueDate: "desc" },
  });

  const today = new Date();
  const rows: PendingInvoiceRow[] = invoices
    .map((inv) => {
      const total = toNumber(inv.total);
      const pagado = inv.payments.reduce((acc, p) => acc + toNumber(p.amount), 0);
      const saldo = total - pagado;
      const due = new Date(inv.dueDate);
      const daysOverdue =
        inv.status === "OVERDUE"
          ? Math.max(0, Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)))
          : null;
      return {
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        number: inv.number,
        clientName: inv.client.name,
        total,
        saldo,
        daysOverdue,
      };
    })
    .filter((r) => r.saldo > 0);

  return { rows, totals: { saldo: rows.reduce((a, r) => a + r.saldo, 0) } };
}

export async function getSales(filters: SalesFilters): Promise<{
  rows: SaleRow[];
  totals: { neto: number; iva: number; total: number };
}> {
  const where: any = { type: "INVOICE", deletedAt: null };
  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.from || filters.to) {
    where.issueDate = {};
    if (filters.from) where.issueDate.gte = filters.from;
    if (filters.to) where.issueDate.lte = filters.to;
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: { client: { select: { name: true } } },
    orderBy: { issueDate: "desc" },
  });

  const rows: SaleRow[] = invoices.map((inv) => ({
    issueDate: inv.issueDate,
    number: inv.number,
    clientName: inv.client.name,
    neto: toNumber(inv.subtotal),
    iva: toNumber(inv.tax),
    total: toNumber(inv.total),
    status: inv.status,
  }));

  const totals = rows.reduce(
    (acc, r) => ({
      neto: acc.neto + r.neto,
      iva: acc.iva + r.iva,
      total: acc.total + r.total,
    }),
    { neto: 0, iva: 0, total: 0 }
  );

  return { rows, totals };
}

export async function getPayments(filters: PaymentsFilters): Promise<{
  rows: PaymentRow[];
  totals: { monto: number };
}> {
  const where: any = { status: "PAGADO", deletedAt: null };
  if (filters.clientId) {
    where.invoice = { clientId: filters.clientId };
  }
  if (filters.from || filters.to) {
    where.date = {};
    if (filters.from) where.date.gte = filters.from;
    if (filters.to) where.date.lte = filters.to;
  }

  const payments = await prisma.payment.findMany({
    where,
    include: { invoice: { include: { client: { select: { name: true } } } } },
    orderBy: { date: "desc" },
  });

  const rows: PaymentRow[] = payments.map((p) => ({
    date: p.date,
    number: p.number,
    clientName: p.invoice?.client.name ?? null,
    method: p.method,
    amount: toNumber(p.amount),
    status: p.status,
  }));

  return {
    rows,
    totals: { monto: rows.reduce((a, r) => a + r.amount, 0) },
  };
}

export async function getCreditNotes(filters: CreditNotesFilters): Promise<{
  rows: CreditNoteRow[];
  totals: { total: number };
}> {
  const where: any = { type: "CREDIT_NOTE", deletedAt: null };
  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.from || filters.to) {
    where.issueDate = {};
    if (filters.from) where.issueDate.gte = filters.from;
    if (filters.to) where.issueDate.lte = filters.to;
  }

  const notes = await prisma.invoice.findMany({
    where,
    include: { client: { select: { name: true } } },
    orderBy: { issueDate: "desc" },
  });

  const rows: CreditNoteRow[] = notes.map((n) => ({
    issueDate: n.issueDate,
    number: n.number,
    clientName: n.client.name,
    total: toNumber(n.total),
  }));

  return {
    rows,
    totals: { total: rows.reduce((a, r) => a + r.total, 0) },
  };
}

export async function getBalances(filters: BalancesFilters): Promise<{
  rows: BalanceRow[];
  totals: { saldoActual: number };
}> {
  const clientWhere: any = { deletedAt: null };
  if (filters.clientId) clientWhere.id = filters.clientId;

  const clients = await prisma.client.findMany({
    where: clientWhere,
    select: { id: true, code: true, name: true },
    orderBy: { name: "asc" },
  });

  const rows: BalanceRow[] = await Promise.all(
    clients.map(async (c): Promise<BalanceRow> => {
      const [facturadoAgg, pagadoAgg, ncAgg] = await Promise.all([
        prisma.invoice.aggregate({
          where: { clientId: c.id, type: "INVOICE", status: { not: "CANCELLED" }, deletedAt: null },
          _sum: { total: true },
        }),
        prisma.payment.aggregate({
          where: { invoice: { clientId: c.id }, status: "PAGADO", deletedAt: null },
          _sum: { amount: true },
        }),
        prisma.invoice.aggregate({
          where: { clientId: c.id, type: "CREDIT_NOTE", deletedAt: null },
          _sum: { total: true },
        }),
      ]);
      const totalFacturado = toNumber(facturadoAgg._sum.total);
      const totalPagado = toNumber(pagadoAgg._sum.amount);
      const totalNotasCredito = toNumber(ncAgg._sum.total);
      const saldoActual = totalFacturado - totalPagado - totalNotasCredito;
      return {
        clientId: c.id,
        clientCode: c.code,
        clientName: c.name,
        totalFacturado,
        totalPagado,
        totalNotasCredito,
        saldoActual,
      };
    })
  );

  rows.sort((a, b) => b.saldoActual - a.saldoActual);

  return {
    rows,
    totals: { saldoActual: rows.reduce((a, r) => a + r.saldoActual, 0) },
  };
}

export type RunReportFilters = {
  clientId?: string;
  from?: string;
  to?: string;
};

export async function runReport(
  type: ReportType,
  filters: RunReportFilters
): Promise<{ rows: unknown[]; totals?: Record<string, number> }> {
  const fromDate = filters.from ? new Date(filters.from) : undefined;
  const toDate = filters.to ? new Date(filters.to) : undefined;
  const baseFilters = {
    clientId: filters.clientId,
    from: fromDate,
    to: toDate,
  };

  switch (type) {
    case "cartola":
      if (!filters.clientId) {
        throw new Error("cartola requiere clientId");
      }
      return getCartola(baseFilters as CartolaFilters);
    case "pending-invoices":
      return getPendingInvoices(baseFilters as PendingFilters);
    case "sales":
      return getSales(baseFilters as SalesFilters);
    case "payments":
      return getPayments(baseFilters as PaymentsFilters);
    case "credit-notes":
      return getCreditNotes(baseFilters as CreditNotesFilters);
    case "balances":
      return getBalances({ clientId: filters.clientId } as BalancesFilters);
    default:
      throw new Error("Tipo de reporte inválido");
  }
}