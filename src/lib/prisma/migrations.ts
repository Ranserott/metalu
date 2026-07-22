import fs from "node:fs";
import path from "node:path";
import { getPGlite } from "./pglite";

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
    // PGlite wraps every `pg.exec(...)` call in a single implicit
    // transaction. Some migrations (notably
    // `20260714210000_rename_quality_check_to_draft`) need to ALTER
    // TYPE ... ADD VALUE and then USE that new value in the next
    // statement, which Postgres rejects with `unsafe use of new value
    // ...` because both happen in the same transaction. Run each
    // statement as its own auto-commit so the new enum value is
    // visible before the next statement references it. Naive
    // `;`-split is fine here because no migration uses BEGIN/COMMIT
    // transaction control.
    const statements = sql
      .split(/;\s*(?:\r?\n|$)/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      await pg.exec(stmt);
    }
    await pg.query(`INSERT INTO _metalu_migrations (id) VALUES ($1)`, [dir]);
  }

  // AC:15 — recompute the v0.2.0 native sequence floors on EVERY migration
  // pass so rows added after the initial migration (or restored from a
  // backup) are reflected in the sequences. The migration's own setval()
  // runs only once per data dir; this keeps the floor in sync with the
  // current MAX(numeric). PGlite only — hosted Postgres owns its own
  // sequence state and is left untouched.
  const isPGlite =
    process.env.METALU_RUNTIME === "tauri" || !!process.env.METALU_TEST_DATA_DIR;
  if (isPGlite) {
    const { recomputeSequenceFloors } = await import("./sequenceRecompute");
    await recomputeSequenceFloors(pg);
  }
}
