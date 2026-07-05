import { PrismaClient } from "@/generated/prisma";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";

export function resolveDataDir(): string {
  // In Tauri: Tauri shell sets METALU_DATA_DIR before spawning Next.
  // In tests: injected via METALU_TEST_DATA_DIR for isolation.
  const dir =
    process.env.METALU_DATA_DIR ??
    process.env.METALU_TEST_DATA_DIR ??
    path.join(process.cwd(), "metalu-db");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

let _pg: PGlite | null = null;

/**
 * Returns the singleton PGlite instance backing the Tauri Prisma client.
 * Used by callers (tests, Tauri boot script in Task 5) that need to run
 * migration SQL on the underlying database before Prisma queries run.
 */
export function getPGlite(): PGlite {
  if (!_pg) {
    _pg = new PGlite(resolveDataDir());
  }
  return _pg;
}

export function createTauriPrismaClient(): PrismaClient {
  const adapter = new PrismaPGlite(getPGlite());
  return new PrismaClient({ adapter });
}

export async function disposeTauriPrisma(): Promise<void> {
  if (_pg) await _pg.close();
  _pg = null;
}
