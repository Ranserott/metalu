import { prisma } from "@/lib/prisma/prisma";
import bcrypt from "bcryptjs";
import { CreateUserInput, UpdateUserInput } from "@/modules/users/validations/userSchemas";

export async function getUsers() {
  return prisma.user.findMany({
    where: { deletedAt: null },
    include: { roles: { include: { role: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id, deletedAt: null },
    include: { roles: { include: { role: true } } },
  });
}

export async function createUser(data: CreateUserInput, createdById: string) {
  const hashedPassword = await bcrypt.hash(data.password, 10);

  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      password: hashedPassword,
      createdById,
      roles: {
        create: data.roles.map((roleId) => ({ roleId })),
      },
    },
    include: { roles: { include: { role: true } } },
  });
}

export async function updateUser(id: string, data: UpdateUserInput) {
  return prisma.user.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.roles !== undefined && {
        roles: {
          deleteMany: {},
          create: data.roles.map((roleId) => ({ roleId })),
        },
      }),
    },
    include: { roles: { include: { role: true } } },
  });
}

export async function deleteUser(id: string) {
  return prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function changePassword(id: string, newPassword: string) {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  return prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });
}

export async function changeOwnPassword(id: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error("Usuario no encontrado");

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) throw new Error("Contraseña actual incorrecta");

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  return prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });
}

export async function canDeleteUser(userId: string): Promise<{ can: boolean; reason?: string }> {
  const userToDelete = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });

  if (!userToDelete) return { can: false, reason: "Usuario no encontrado" };

  const isAdmin = userToDelete.roles.some((r: { role: { name: string } }) => r.role.name === "Admin");
  if (isAdmin) return { can: true }; // Non-admins can always be deleted

  // Check if there are other active admins
  const otherAdmins = await prisma.user.count({
    where: {
      deletedAt: null,
      isActive: true,
      id: { not: userId },
      roles: { some: { role: { name: "Admin" } } },
    },
  });

  if (otherAdmins === 0) {
    return { can: false, reason: "No se puede eliminar al último administrador" };
  }

  return { can: true };
}