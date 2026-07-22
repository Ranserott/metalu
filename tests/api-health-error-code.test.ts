import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("health endpoint error codes", () => {
  let tmpDir: string;
  let GET: typeof import("@/app/api/health/route").GET;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "metalu-health-test-"));
    process.env.METALU_TEST_DATA_DIR = tmpDir;
    process.env.METALU_RUNTIME = "tauri";

    const { applyMigrations } = await import("@/lib/prisma/migrations");
    await applyMigrations();
    ({ GET } = await import("@/app/api/health/route"));
  });

  afterAll(async () => {
    const { disposeTauriPrisma } = await import("@/lib/prisma/pglite");
    await disposeTauriPrisma();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.METALU_TEST_DATA_DIR;
    delete process.env.METALU_RUNTIME;
  });

  it("returns ready after migrations are applied", async () => {
    const { applyMigrations } = await import("@/lib/prisma/migrations");
    await applyMigrations();

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.code).toBe("ready");
  });

  it("returns a structured error code when the database is unavailable", async () => {
    const { disposeTauriPrisma } = await import("@/lib/prisma/pglite");
    await disposeTauriPrisma();

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(typeof body.code).toBe("string");
    expect(body.code.length).toBeGreaterThan(0);
  });
});
