import bcrypt from "bcryptjs";
import type { PrismaClient } from "@/generated/prisma";

export async function seedDefaultData(prisma: PrismaClient): Promise<void> {
  const adminRole = await prisma.role.upsert({
    where: { name: "Admin" },
    update: {},
    create: { name: "Admin" },
  });

  await prisma.role.upsert({
    where: { name: "Supervisor" },
    update: {},
    create: { name: "Supervisor" },
  });

  let admin = await prisma.user.findFirst({ where: { name: "admin" } });

  if (!admin) {
    admin = await prisma.user.create({
      data: {
        name: "admin",
        password: await bcrypt.hash("admin123", 12),
        isActive: true,
      },
    });
  }

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: adminRole.id,
    },
  });
}
