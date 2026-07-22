import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let tmpDir: string;
let prisma: typeof import("@/lib/prisma/prisma")["prisma"];
let seedDefaultData: typeof import("@/lib/prisma/seedDefaultData")["seedDefaultData"];

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "metalu-seed-defaults-"));
  process.env.METALU_TEST_DATA_DIR = tmpDir;
  process.env.METALU_RUNTIME = "tauri";

  ({ seedDefaultData } = await import("@/lib/prisma/seedDefaultData"));
  const prismaModule = await import("@/lib/prisma/prisma");
  await prismaModule.waitForTauriReady();
  prisma = prismaModule.prisma;
});

afterAll(async () => {
  await prisma?.$disconnect();
  const { disposeTauriPrisma } = await import("@/lib/prisma/pglite");
  await disposeTauriPrisma();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.METALU_TEST_DATA_DIR;
  delete process.env.METALU_RUNTIME;
});

describe("default PGlite data", () => {
  it("creates an active admin with the documented credentials and role", async () => {
    const admin = await prisma.user.findFirst({
      where: { name: "admin" },
      include: { roles: { include: { role: true } } },
    });

    expect(admin).not.toBeNull();
    expect(admin?.isActive).toBe(true);
    expect(await bcrypt.compare("admin123", admin!.password)).toBe(true);
    expect(admin?.roles.map(({ role }) => role.name)).toContain("Admin");
  });

  it("is idempotent", async () => {
    await seedDefaultData(prisma);
    await seedDefaultData(prisma);

    expect(await prisma.user.count({ where: { name: "admin" } })).toBe(1);
    expect(await prisma.role.count({ where: { name: "Admin" } })).toBe(1);
    expect(await prisma.role.count({ where: { name: "Supervisor" } })).toBe(1);
  });
});
