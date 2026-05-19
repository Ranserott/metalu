export type Invoice = {
  id: string;
  number: string;
  clientId: string;
  workOrderId: string | null;
  type: string;
  status: string;
  series: string;
  numberInSeries: number;
  issueDate: Date;
  dueDate: Date;
  subtotal: string;
  tax: string;
  total: string;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};