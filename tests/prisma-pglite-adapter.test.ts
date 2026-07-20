import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("pglite prisma adapter", () => {
  let tmpDir: string;
  let createTauriPrismaClient: typeof import("@/lib/prisma/pglite").createTauriPrismaClient;
  let applyMigrations: typeof import("@/lib/prisma/migrations").applyMigrations;
  let dispose: () => Promise<void>;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "metalu-pglite-test-"));
    process.env.METALU_TEST_DATA_DIR = tmpDir;
    const clientMod = await import("@/lib/prisma/pglite");
    createTauriPrismaClient = clientMod.createTauriPrismaClient;
    dispose = clientMod.disposeTauriPrisma;
    const { applyMigrations: apply } = await import("@/lib/prisma/migrations");
    applyMigrations = apply;
    // Replicate what Tauri's boot script (Task 5) will do: apply
    // every prisma/migrations/*/migration.sql before Prisma queries run.
    await applyMigrations();
  });

  afterAll(async () => {
    await dispose();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.METALU_TEST_DATA_DIR;
  });

  it("creates a user and queries it back", async () => {
    const prisma = createTauriPrismaClient();
    const user = await prisma.user.create({
      data: {
        password: "x",
        name: "Test User",
      },
    });
    expect(user.id).toBeTruthy();
    const found = await prisma.user.findUnique({ where: { id: user.id } });
    expect(found?.name).toBe(user.name);
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  });
});
