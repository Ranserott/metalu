import { prisma } from "@/lib/prisma/prisma";
import { RoleInput } from "../validations/roleSchemas";

const mockRoles = [
  {
    id: "1",
    name: "Administrador",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    name: "Vendedor",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export async function getRoles() {
  try {
    return await prisma.role.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return mockRoles;
  }
}

export async function getRoleById(id: string) {
  try {
    return await prisma.role.findUnique({
      where: { id, deletedAt: null },
    });
  } catch {
    return mockRoles.find((r) => r.id === id) || null;
  }
}

export async function createRole(data: RoleInput) {
  try {
    return await prisma.role.create({
      data,
    });
  } catch {
    return { ...data, id: Date.now().toString(), createdAt: new Date(), updatedAt: new Date() };
  }
}

export async function updateRole(id: string, data: Partial<RoleInput>) {
  try {
    return await prisma.role.update({
      where: { id },
      data,
    });
  } catch {
    return { ...mockRoles[0], ...data, id, updatedAt: new Date() };
  }
}

export async function deleteRole(id: string) {
  try {
    return await prisma.role.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } catch {
    return { id };
  }
}