export type Client = {
  id: string;
  code: string;
  name: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  giro: string | null;
  oc: string | null;
  lastPaymentDate: string | null;
  currentBalance: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: { name: string } | null;
  recentQuotations?: QuotationSummary[];
  recentInvoices?: InvoiceSummary[];
};

export type QuotationSummary = {
  id: string;
  number: string;
  status: string;
  total: number;
  createdAt: Date;
};

export type InvoiceSummary = {
  id: string;
  number: string;
  status: string;
  total: number;
  issueDate: Date;
  dueDate: Date | null;
};

export type ClientUpdateInput = Partial<Omit<Client, "id" | "createdAt" | "updatedAt" | "createdBy" | "recentQuotations" | "recentInvoices">>;
