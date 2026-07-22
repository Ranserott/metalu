import type { PGlite } from "@electric-sql/pglite";

/**
 * Recomputes the v0.2.0 native sequence floors from the CURRENT table
 * contents. Spec AC:15.
 *
 * The one-shot migration in `prisma/migrations/20260720000000_v020_sequences/`
 * seeds each sequence via `setval(seq, floor, true)` exactly once per data
 * dir. Rows added AFTER that first pass — or restored from a backup — are
 * not reflected in the sequence, so a later `nextval()` could collide with
 * an existing number. This helper re-runs the identical floor calculation
 * on every migration pass (PGlite only) so the floor always tracks
 * `MAX(numeric)`.
 *
 * Floor contract (matches the migration):
 *   floor = GREATEST(base - 1, MAX(CAST(number AS BIGINT) WHERE number is
 *           all digits))
 * so the NEXT `nextval()` returns `floor + 1`.
 *
 * Safety: only rows whose `number` matches `^[0-9]+$` participate. Digitless
 * historical values (e.g. "PENDIENTE") or mixed strings ("LEGACY-001") are
 * preserved in the table but excluded from the calc — casting them to BIGINT
 * would raise `invalid input syntax for type bigint`, so we NEVER cast the
 * non-numeric rows (this is why we filter with `~ '^[0-9]+$'` instead of
 * REGEXP_REPLACE-then-cast).
 */
export async function recomputeSequenceFloors(pg: PGlite): Promise<void> {
  // The v0.2.0 native sequence-floor recompute only matters for tables whose
  // `number` column is a Postgres-backed SERIAL/BIGSERIAL. In v0.2.0+ the
  // Quotation.number and WorkOrder.number columns are String (the format is
  // generated in app code), so no `*_number_seq` sequence is ever created.
  // Querying `pg_sequences` first makes the helper a no-op on a v0.2.0+ DB
  // while preserving the original AC:15 behaviour on schemas that DO define
  // these sequences (e.g. a future migration that switches back to integer
  // numbering). Without this guard, applyMigrations() throws on every
  // fresh PGlite and breaks 9 test files at their `beforeAll`.
  const seqs = await pg.query<{ sequencename: string }>(
    `SELECT sequencename FROM pg_sequences
      WHERE schemaname = 'public'
        AND sequencename IN ('quotations_number_seq', 'work_orders_number_seq')`
  );
  const existing = new Set(seqs.rows.map((r) => r.sequencename));

  if (existing.has("quotations_number_seq")) {
    await pg.exec(`
      SELECT setval(
        'quotations_number_seq',
        GREATEST(
          COALESCE(
            (
              SELECT MAX(CAST("number" AS BIGINT))
              FROM "quotations"
              WHERE "number" ~ '^[0-9]+$'
            ),
            0
          ),
          2999
        ),
        true
      );
    `);
  }

  if (existing.has("work_orders_number_seq")) {
    await pg.exec(`
      SELECT setval(
        'work_orders_number_seq',
        GREATEST(
          COALESCE(
            (
              SELECT MAX(CAST("number" AS BIGINT))
              FROM "work_orders"
              WHERE "number" ~ '^[0-9]+$'
            ),
            0
          ),
          109999
        ),
        true
      );
    `);
  }
}
