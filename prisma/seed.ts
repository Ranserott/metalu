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

  // Create default admin user
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@metalflow.com" },
    update: {},
    create: {
      email: "admin@metalflow.com",
      password: hashedPassword,
      name: "admin",
      isActive: true,
      roles: {
        create: { roleId: adminRole.id },
      },
    },
  });

  console.log("✅ Seed completed");
  console.log("Admin user: admin@metalflow.com / admin123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });