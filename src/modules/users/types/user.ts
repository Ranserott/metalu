export type User = {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  roles: { role: { id: string; name: string } }[];
  createdBy: { id: string; name: string } | null;
};
