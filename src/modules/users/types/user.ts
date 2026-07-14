import { Role } from "@/modules/roles/types/role";

export interface User {
  id: string;
  name: string;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdById: string | null;
  roles: Role[];
}