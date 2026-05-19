export type Quotation = {
  id: string;
  number: string;
  clientId: string;
  status: string;
  validUntil: Date;
  subtotal: string;
  tax: string;
  total: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};