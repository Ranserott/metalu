import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("version endpoint", () => {
  let dispose: () => Promise<void>;
  let GET: typeof import("@/app/api/version/route").GET;

  beforeAll(async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "metalu-version-test-"));
    process.env.METALU_TEST_DATA_DIR = dir;
    process.env.METALU_RUNTIME = "tauri";
    const mod = await import("@/app/api/version/route");
    GET = mod.GET;
    const { disposeTauriPrisma } = await import("@/lib/prisma/pglite");
    dispose = disposeTauriPrisma;
    // Run migrations so the version route's prisma query (if any) has schema.
    const { applyMigrations } = await import("@/lib/prisma/migrations");
    await applyMigrations();
  });

  afterAll(async () => {
    await dispose();
    delete process.env.METALU_TEST_DATA_DIR;
    delete process.env.METALU_RUNTIME;
  });

  it("returns appVersion and schemaVersion", async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.appVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(typeof body.schemaVersion).toBe("string");
  });
});