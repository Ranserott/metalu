export type ReportType =
  | "cartola"
  | "pending-invoices"
  | "sales"
  | "payments"
  | "credit-notes"
  | "balances";

export type ReportFilters = {
  clientId?: string;
  from?: string;
  to?: string;
};

export type CartolaRow = {
  date: Date;
  type: "FACTURA" | "PAGO" | "NOTA CREDITO";
  documentNumber: string;
  detail: string;
  charge: number;
  payment: number;
  balance: number;
};

export type PendingInvoiceRow = {
  issueDate: Date;
  dueDate: Date;
  number: string;
  clientName: string;
  total: number;
  saldo: number;
  daysOverdue: number | null;
};

export type SaleRow = {
  issueDate: Date;
  number: string;
  clientName: string;
  neto: number;
  iva: number;
  total: number;
  status: string;
};

export type PaymentRow = {
  date: Date;
  number: string;
  clientName: string | null;
  method: string;
  amount: number;
  status: string;
};

export type CreditNoteRow = {
  issueDate: Date;
  number: string;
  clientName: string;
  total: number;
};

export type BalanceRow = {
  clientId: string;
  clientCode: string;
  clientName: string;
  totalFacturado: number;
  totalPagado: number;
  totalNotasCredito: number;
  saldoActual: number;
};

export type ReportResponse<T> = {
  rows: T[];
  totals?: Record<string, number>;
};