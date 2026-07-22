import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { importPgliteBackup } from "@/lib/backup";

export interface RestoreOptions {
  dbDir: string;
  backupsDir: string;
}

export interface RestoreResult {
  restoredFrom: string;
  sizeBytes: number;
}

function lockPath(backupsDir: string): string {
  return path.join(backupsDir, "..", "restore.lock");
}

async function acquireLock(lockFile: string): Promise<void> {
  try {
    await fs.writeFile(lockFile, String(process.pid), { flag: "wx" });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error("restore in progress (lock file exists)");
    }
    throw e;
  }
}

async function releaseLock(lockFile: string): Promise<void> {
  await fs.unlink(lockFile).catch(() => {
    /* already gone */
  });
}

export async function restoreBackup(
  bytes: Uint8Array,
  opts: RestoreOptions,
): Promise<RestoreResult> {
  const lockFile = lockPath(opts.backupsDir);
  await acquireLock(lockFile);

  await fs.mkdir(opts.backupsDir, { recursive: true });
  const tempName = `restore-${crypto.randomBytes(6).toString("hex")}.tmp`;
  const tempPath = path.join(opts.backupsDir, tempName);
  await fs.writeFile(tempPath, bytes);

  try {
    await importPgliteBackup(tempPath);
    return { restoredFrom: "uploaded-file", sizeBytes: bytes.length };
  } finally {
    await fs.unlink(tempPath).catch(() => {
      /* temp already gone */
    });
    await releaseLock(lockFile);
  }
}
