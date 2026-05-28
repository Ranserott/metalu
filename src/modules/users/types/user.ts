import { Role } from "@/modules/roles/types/role";

export interface User {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdById: string | null;
  roles: Role[];
}

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  roles: string[];
};

export type UpdateUserInput = {
  name?: string;
  email?: string;
  isActive?: boolean;
  roles?: string[];
};

export type ChangePasswordInput = {
  currentPassword?: string;
  newPassword: string;
};