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
};