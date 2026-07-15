import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 12);

  // Create Admin role
  const adminRole = await prisma.role.upsert({
    where: { name: "Admin" },
    update: {},
    create: { name: "Admin" },
  });

  // Create Supervisor role (assignable via /users; permissions live in
  // src/lib/auth/permissions.ts — this row is just the role reference).
  const supervisorRole = await prisma.role.upsert({
    where: { name: "Supervisor" },
    update: {},
    create: { name: "Supervisor" },
  });

  // Create default admin user. `email` is no longer a unique field on User
  // (we use `name` as the login identifier), so we do an explicit
  // find-or-create instead of upsert to keep the seed idempotent.
  const existingAdmin = await prisma.user.findFirst({ where: { name: "admin" } });
  const adminUser = existingAdmin
    ? await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { password: hashedPassword, isActive: true },
      })
    : await prisma.user.create({
        data: {
          name: "admin",
          password: hashedPassword,
          isActive: true,
          roles: {
            create: { roleId: adminRole.id },
          },
        },
      });

  console.log("✅ Seed completed");
  console.log("Admin user: admin / admin123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });