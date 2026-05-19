export type WorkOrder = {
  id: string;
  number: string;
  clientId: string;
  quotationId: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};