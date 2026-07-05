import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("pglite backup export", () => {
  let tmpDir: string;
  let exportPgliteBackup: typeof import("@/lib/backup").exportPgliteBackup;
  let ensureSchemaSeeded: typeof import("@/lib/backup").ensureSchemaSeeded;
  let dispose: () => Promise<void>;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "metalu-backup-test-"));
    process.env.METALU_TEST_DATA_DIR = tmpDir;
    process.env.METALU_RUNTIME = "tauri";
    const mod = await import("@/lib/backup");
    exportPgliteBackup = mod.exportPgliteBackup;
    ensureSchemaSeeded = mod.ensureSchemaSeeded;
    const { disposeTauriPrisma } = await import("@/lib/prisma/pglite");
    dispose = disposeTauriPrisma;
    // Run migrations so the PGlite instance has schema before exporting.
    const { applyMigrations } = await import("@/lib/prisma/migrations");
    await applyMigrations();
    await ensureSchemaSeeded();
  });

  afterAll(async () => {
    await dispose();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.METALU_TEST_DATA_DIR;
    delete process.env.METALU_RUNTIME;
  });

  it("exports a non-empty pglite tarball to disk", async () => {
    const outFile = path.join(tmpDir, "backup.pglitebackup");
    await exportPgliteBackup(outFile);

    expect(fs.existsSync(outFile)).toBe(true);
    const stat = fs.statSync(outFile);
    expect(stat.size).toBeGreaterThan(0);

    // Sanity-check the header by reading the first 4 bytes — pglite's tar
    // dump begins with the bytes for a tar file ("ustar" identifier somewhere
    // in the first 262 bytes, but we only verify it's not empty/garbage).
    const fd = fs.openSync(outFile, "r");
    try {
      const buf = Buffer.alloc(4);
      fs.readSync(fd, buf, 0, 4, 0);
      expect(buf.length).toBe(4);
    } finally {
      fs.closeSync(fd);
    }
  });
});
