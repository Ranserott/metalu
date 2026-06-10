import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma/prisma";
import { UserInput } from "../validations/userSchemas";

export async function getUsers() {
  return await prisma.user.findMany({
    where: { deletedAt: null },
    include: {
      roles: { include: { role: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserById(id: string) {
  return await prisma.user.findUnique({
    where: { id, deletedAt: null },
    include: { roles: { include: { role: true } } },
  });
}

export async function createUser(data: UserInput, createdById: string) {
  const hashedPassword = await bcrypt.hash(data.password!, 12);

  return await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      password: hashedPassword,
      isActive: data.isActive,
      createdById,
      roles: {
        create: data.roleIds.map((roleId) => ({ roleId })),
      },
    },
    include: { roles: { include: { role: true } } },
  });
}

export async function updateUser(id: string, data: Partial<UserInput>) {
  const updateData: any = {
    email: data.email,
    name: data.name,
    isActive: data.isActive,
  };

  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 12);
  }

  return await prisma.user.update({
    where: { id },
    data: updateData,
  });
}

export async function updateUserRoles(userId: string, roleIds: string[]) {
  await prisma.userRole.deleteMany({ where: { userId } });

  if (roleIds.length > 0) {
    await prisma.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId, roleId })),
    });
  }
}

export async function deleteUser(id: string) {
  return await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  return await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });
}
