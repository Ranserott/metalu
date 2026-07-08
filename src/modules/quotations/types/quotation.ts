export type Quotation = {
  id: string;
  number: string;
  clientId: string;
  client: { id: string; name: string };
  createdBy?: { id: string; name: string | null } | null;
  status: string;
  validUntil: Date;
  subtotal: number;
  tax: number;
  total: number;
  discount?: number | null;
  discountType?: "NONE" | "AMOUNT" | "PERCENT" | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};
