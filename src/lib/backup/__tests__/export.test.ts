import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

vi.mock("@/lib/backup", () => ({
  defaultBackupName: vi.fn(() => "metalu-20260721.pglitebackup"),
  exportPgliteBackup: vi.fn(async (outPath: string) => {
    // Simulate writing 4096 bytes to disk
    await fs.writeFile(outPath, Buffer.alloc(4096));
    return outPath;
  }),
}));

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "metalu-export-test-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
  vi.clearAllMocks();
});

describe("exportBackup", () => {
  it("writes a dated .pglitebackup file with correct size", async () => {
    const { exportBackup } = await import("../export");
    const result = await exportBackup(tmpDir);
    expect(result.filename).toBe("metalu-20260721.pglitebackup");
    expect(result.fullPath).toBe(path.join(tmpDir, "metalu-20260721.pglitebackup"));
    expect(result.sizeBytes).toBe(4096);
    const exists = await fs.stat(result.fullPath);
    expect(exists.size).toBe(4096);
  });

  it("creates the backups dir if it doesn't exist", async () => {
    const nested = path.join(tmpDir, "nested", "backups");
    const { exportBackup } = await import("../export");
    await exportBackup(nested);
    const stat = await fs.stat(nested);
    expect(stat.isDirectory()).toBe(true);
  });
});

describe("listBackups", () => {
  it("returns empty array when dir doesn't exist", async () => {
    const missing = path.join(tmpDir, "does-not-exist");
    const { listBackups } = await import("../export");
    const list = await listBackups(missing);
    expect(list).toEqual([]);
  });

  it("returns parsed backup list sorted desc by date", async () => {
    await fs.writeFile(path.join(tmpDir, "metalu-20260720.pglitebackup"), Buffer.alloc(2048));
    await fs.writeFile(path.join(tmpDir, "metalu-20260721.pglitebackup"), Buffer.alloc(4096));
    await fs.writeFile(path.join(tmpDir, "other-file.txt"), "ignore me");
    const { listBackups } = await import("../export");
    const list = await listBackups(tmpDir);
    expect(list).toHaveLength(2);
    expect(list[0].filename).toBe("metalu-20260721.pglitebackup");
    expect(list[0].sizeBytes).toBe(4096);
    expect(list[0].createdAt).toBe("2026-07-21T00:00:00.000Z");
    expect(list[1].filename).toBe("metalu-20260720.pglitebackup");
    expect(list[1].sizeBytes).toBe(2048);
  });
});