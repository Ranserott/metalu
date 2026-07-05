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

/**
 * Applies every migration SQL file in `prisma/migrations/*\/migration.sql`
 * against the shared PGlite instance, in lexicographic order. Idempotent
 * within a single PGlite lifetime (each file runs at most once).
 *
 * Tracks applied files in a small `_metalu_migrations` table so re-running
 * (e.g. after a re-create during tests) skips already-applied files.
 */
export async function applyMigrations(): Promise<void> {
  const pg = getPGlite();

  await pg.exec(`
    CREATE TABLE IF NOT EXISTS _metalu_migrations (
      id TEXT PRIMARY KEY
    );
  `);

  const migrationsDir = path.resolve(process.cwd(), "prisma", "migrations");
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  const dirs = fs
    .readdirSync(migrationsDir)
    .filter((name) => {
      const full = path.join(migrationsDir, name);
      return (
        fs.statSync(full).isDirectory() &&
        fs.existsSync(path.join(full, "migration.sql"))
      );
    })
    .sort();

  const appliedRows = (await pg.query(
    "SELECT id FROM _metalu_migrations"
  )) as { rows: { id: string }[] };
  const applied = new Set(appliedRows.rows.map((r) => r.id));

  for (const dir of dirs) {
    if (applied.has(dir)) continue;
    const sql = fs.readFileSync(
      path.join(migrationsDir, dir, "migration.sql"),
      "utf8"
    );
    await pg.exec(sql);
    await pg.query(`INSERT INTO _metalu_migrations (id) VALUES ($1)`, [dir]);
  }
}

export function createTauriPrismaClient(): PrismaClient {
  const adapter = new PrismaPGlite(getPGlite());
  return new PrismaClient({ adapter });
}

export async function disposeTauriPrisma(): Promise<void> {
  if (_pg) await _pg.close();
  _pg = null;
}
