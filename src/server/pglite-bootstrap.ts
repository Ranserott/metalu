import path from "node:path";
import fs from "node:fs";
import os from "node:os";

export interface DataDirInfo {
  dataDir: string;
  dbDir: string;
  backupsDir: string;
}

export function resolveDataDir(): DataDirInfo {
  const appData =
    process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
  const dataDir = path.join(appData, "metalu");
  const dbDir = path.join(dataDir, "db");
  const backupsDir = path.join(dataDir, "backups");
  fs.mkdirSync(dbDir, { recursive: true });
  fs.mkdirSync(backupsDir, { recursive: true });
  return { dataDir, dbDir, backupsDir };
}
