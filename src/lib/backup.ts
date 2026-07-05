import fs from "node:fs";
import path from "node:path";
import {
  createTauriPrismaClient,
  disposeTauriPrisma,
  getPGlite,
  resolveDataDir,
} from "@/lib/prisma/pglite";

/**
 * Format used by pglite's `dumpDataDir()`. The dump is a tar archive (optionally
 * gzipped) containing the on-disk representation of every PGlite tablespace.
 * We accept `.tar`, `.tgz`, and `.pglitebackup` as file extensions for backups.
 */
const BACKUP_EXTENSIONS = new Set([".pglitebackup", ".tar", ".tgz", ".tar.gz"]);

/**
 * Compute the destination directory for backup files. Honors an explicit
 * `METALU_BACKUP_DIR` override so admins can point backups at external storage.
 * Falls back to `<data-dir>/backups` alongside the live database.
 */
export function backupDir(): string {
  const dir =
    process.env.METALU_BACKUP_DIR ??
    path.join(resolveDataDir(), "backups");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Default file name for a fresh backup, e.g. `metalu-20260705.pglitebackup`.
 * Uses UTC date so a backup file's name matches the snapshot timestamp.
 */
export function defaultBackupName(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `metalu-${y}${m}${d}.pglitebackup`;
}

/**
 * Touch the Prisma client so the underlying PGlite is initialized, schema is
 * migrated, and at minimum one SELECT works. Used by tests and the boot
 * script before the first call to `exportPgliteBackup()` — without it the
 * PGlite directory may be empty (no tables) and the dump is valid but tiny.
 */
export async function ensureSchemaSeeded(): Promise<void> {
  const prisma = createTauriPrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
  } finally {
    await prisma.$disconnect();
    // Don't dispose the singleton PGlite — the caller may continue to use it.
    // Tests call `disposeTauriPrisma()` explicitly in afterAll.
  }
}

/**
 * Write a pglite directory dump of the singleton database to `outPath`.
 * Returns the absolute path that was written (caller-friendly).
 */
export async function exportPgliteBackup(outPath: string): Promise<string> {
  const abs = path.resolve(outPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });

  const pg = getPGlite();
  const blob = await pg.dumpDataDir();

  // pglite returns a Blob (browser) or File (Node) — both expose arrayBuffer().
  const buf = Buffer.from(await blob.arrayBuffer());
  fs.writeFileSync(abs, buf);
  return abs;
}

/**
 * Restore a pglite directory dump produced by `exportPgliteBackup()`. Disposes
 * the existing singleton first so the new instance can re-open `dataDir` with
 * the imported contents.
 *
 * Caller is responsible for snapshotting/confirming before invoking — this
 * destroys the live database on success.
 */
export async function importPgliteBackup(inPath: string): Promise<void> {
  const abs = path.resolve(inPath);
  if (!fs.existsSync(abs)) {
    throw new Error(`Backup file not found: ${abs}`);
  }

  // Validate the file extension so we don't silently accept the wrong format.
  const lower = abs.toLowerCase();
  const matches = [...BACKUP_EXTENSIONS].some((ext) => lower.endsWith(ext));
  if (!matches) {
    throw new Error(
      `Unsupported backup extension (expected one of: ${[...BACKUP_EXTENSIONS].join(", ")})`,
    );
  }

  // pglite's `loadDataDir` constructor option accepts a tarball Blob/File.
  // We re-read the bytes and hand a File to a fresh PGlite pointed at the
  // same data directory — we can't mutate the singleton in place, so we
  // close it, recreate, and run the load on first open.
  const dataDir = resolveDataDir();
  await disposeTauriPrisma();

  const { PGlite } = await import("@electric-sql/pglite");
  const bytes = fs.readFileSync(abs);
  const file = new File([bytes], path.basename(abs), { type: "application/x-tar" });

  const fresh = new PGlite(dataDir, { loadDataDir: file });
  await fresh.waitReady;
  await fresh.close();

  // Reset the module-level cache so subsequent `getPGlite()` calls re-open.
  // We do this by going through `disposeTauriPrisma` which nulls `_pg`,
  // and then forcing a single SELECT to lazily re-init the singleton.
  const { getPGlite: getAfterReset } = await import("@/lib/prisma/pglite");
  const pg = getAfterReset();
  await pg.query("SELECT 1");
}

/**
 * Convenience: produce a BackupSummary describing the given path (size + mtime).
 * Used by the admin panel to show the most recent backup file.
 */
export type BackupSummary = {
  path: string;
  sizeBytes: number;
  mtimeMs: number;
};

export function describeBackup(p: string): BackupSummary | null {
  if (!fs.existsSync(p)) return null;
  const st = fs.statSync(p);
  return {
    path: p,
    sizeBytes: st.size,
    mtimeMs: st.mtimeMs,
  };
}
