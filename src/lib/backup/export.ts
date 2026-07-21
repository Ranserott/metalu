import fs from "node:fs/promises";
import path from "node:path";
import { defaultBackupName, exportPgliteBackup } from "@/lib/backup";

export interface BackupResult {
  filename: string;
  sizeBytes: number;
  fullPath: string;
}

export interface BackupInfo {
  filename: string;
  sizeBytes: number;
  createdAt: string;
}

const BACKUP_FILENAME_RE = /^metalu-(\d{8})\.pglitebackup$/;

export async function exportBackup(backupsDir: string): Promise<BackupResult> {
  const filename = defaultBackupName();
  const fullPath = path.join(backupsDir, filename);
  await fs.mkdir(backupsDir, { recursive: true });
  const written = await exportPgliteBackup(fullPath);
  const st = await fs.stat(written);
  return { filename, sizeBytes: st.size, fullPath: written };
}

export async function listBackups(backupsDir: string): Promise<BackupInfo[]> {
  let names: string[];
  try {
    names = await fs.readdir(backupsDir);
  } catch {
    return [];
  }
  const matching = names.filter((n) => BACKUP_FILENAME_RE.test(n));
  const infos = await Promise.all(
    matching.map(async (filename) => {
      const st = await fs.stat(path.join(backupsDir, filename));
      const m = filename.match(BACKUP_FILENAME_RE);
      const createdAt = m
        ? new Date(
            `${m[1].slice(0, 4)}-${m[1].slice(4, 6)}-${m[1].slice(6, 8)}T00:00:00Z`,
          ).toISOString()
        : st.mtime.toISOString();
      return { filename, sizeBytes: st.size, createdAt };
    }),
  );
  infos.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return infos;
}