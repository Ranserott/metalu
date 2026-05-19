export type Payment = {
  id: string;
  number: string;
  invoiceId: string;
  amount: string;
  method: string;
  reference: string | null;
  date: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};