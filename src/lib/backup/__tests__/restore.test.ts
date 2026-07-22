import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

vi.mock("@/lib/backup", () => ({
  importPgliteBackup: vi.fn(async () => {
    /* simulate restore work */
  }),
}));

let tmpDir: string;
let dbDir: string;
let backupsDir: string;
let lockFile: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "metalu-restore-test-"));
  dbDir = path.join(tmpDir, "db");
  backupsDir = path.join(tmpDir, "backups");
  lockFile = path.join(tmpDir, "restore.lock");
  await fs.mkdir(dbDir, { recursive: true });
  await fs.mkdir(backupsDir, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
  vi.clearAllMocks();
});

describe("restoreBackup", () => {
  it("imports bytes into pglite and releases the lock", async () => {
    const { restoreBackup } = await import("../restore");
    const bytes = new Uint8Array([9, 8, 7]);
    const result = await restoreBackup(bytes, { dbDir, backupsDir });
    expect(result.restoredFrom).toBe("uploaded-file");
    expect(result.sizeBytes).toBe(3);
    // Lock file was released
    await expect(fs.access(lockFile)).rejects.toThrow();
    // Temp file was cleaned up
    const remaining = await fs.readdir(backupsDir);
    expect(remaining.filter((f) => f.endsWith(".tmp"))).toEqual([]);
  });

  it("throws when lock file exists (concurrent restore)", async () => {
    // Pre-create the lock file
    await fs.writeFile(lockFile, "9999");
    const { restoreBackup } = await import("../restore");
    await expect(
      restoreBackup(new Uint8Array([1]), { dbDir, backupsDir }),
    ).rejects.toThrow(/restore in progress/i);
    // The pre-existing lock should still be there (we didn't take it)
    const stat = await fs.stat(lockFile);
    expect(stat.isFile()).toBe(true);
  });

  it("releases lock even when import fails", async () => {
    const { importPgliteBackup } = await import("@/lib/backup");
    (importPgliteBackup as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("pglite boom"),
    );
    const { restoreBackup } = await import("../restore");
    await expect(
      restoreBackup(new Uint8Array([1]), { dbDir, backupsDir }),
    ).rejects.toThrow(/pglite boom/);
    // Lock released even after error
    await expect(fs.access(lockFile)).rejects.toThrow();
  });
});
