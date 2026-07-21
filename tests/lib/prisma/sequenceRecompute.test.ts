import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { PGlite } from "@electric-sql/pglite";

/**
 * Task 1.9 — recompute v0.2 native sequence floors on every migration pass
 * (spec AC:15).
 *
 * The migration in 20260720000000_v020_sequences runs the setval() floor
 * calc ONCE per data dir. Rows added AFTER that first pass (or restored
 * from a backup) would not be reflected in the sequence, so a later
 * nextval() could collide with an existing number. `recomputeSequenceFloors`
 * re-runs the safe floor computation so the floor always tracks the current
 * table MAX.
 *
 * Lives under tests/lib/prisma (NOT under src/) because vitest.config.ts
 * restricts `include` to `tests/**` — a sibling test inside src/ would
 * silently never run.
 */

describe("recomputeSequenceFloors on PGlite (AC:15)", () => {
  let tmpDir: string;
  let pg: PGlite;
  let dispose: typeof import("@/lib/prisma/pglite").disposeTauriPrisma;
  let createTauriPrismaClient: typeof import("@/lib/prisma/pglite").createTauriPrismaClient;
  let recomputeSequenceFloors: typeof import("@/lib/prisma/sequenceRecompute").recomputeSequenceFloors;

  async function nextval(seq: string): Promise<string> {
    const res = await pg.query<{ n: string }>(
      `SELECT nextval('${seq}')::text AS n`
    );
    return res.rows[0].n;
  }

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "metalu-seq-recompute-"));
    // MUST be set before importing pglite: the singleton binds its data dir
    // on first getPGlite() call and cannot be redirected afterwards.
    process.env.METALU_TEST_DATA_DIR = tmpDir;
    process.env.METALU_RUNTIME = "tauri";

    const pglite = await import("@/lib/prisma/pglite");
    const migrations = await import("@/lib/prisma/migrations");
    const recompute = await import("@/lib/prisma/sequenceRecompute");
    dispose = pglite.disposeTauriPrisma;
    createTauriPrismaClient = pglite.createTauriPrismaClient;
    recomputeSequenceFloors = recompute.recomputeSequenceFloors;

    await migrations.applyMigrations();
    pg = pglite.getPGlite();

    // Seed data AFTER the initial migration pass so the migration's own
    // setval() has already run against an empty table (floor fell back to
    // base-1). This is the exact AC:15 scenario: rows appear later.
    const prisma = createTauriPrismaClient();
    try {
      const client = await prisma.client.create({
        data: { code: "TEST-CLIENT-RECOMPUTE", name: "Recompute Client" },
      });
      // Numeric historical quotation that must drive the floor.
      await prisma.quotation.create({
        data: {
          number: "5000",
          status: "DRAFT",
          validUntil: new Date(Date.now() + 30 * 86_400_000),
          subtotal: "0",
          tax: "0",
          total: "0",
          clientId: client.id,
        },
      });
      // Non-numeric historical value: must be preserved but IGNORED by the
      // floor calc. If the recompute helper cast this to BIGINT it would
      // crash (''::BIGINT is invalid) — this row proves it does not.
      await prisma.quotation.create({
        data: {
          number: "PENDIENTE",
          status: "DRAFT",
          validUntil: new Date(Date.now() + 30 * 86_400_000),
          subtotal: "0",
          tax: "0",
          total: "0",
          clientId: client.id,
        },
      });
    } finally {
      await prisma.$disconnect();
    }
  });

  afterAll(async () => {
    await dispose();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.METALU_TEST_DATA_DIR;
    delete process.env.METALU_RUNTIME;
  });

  it("recomputes the quotation floor from MAX(numeric) ignoring non-numeric rows", async () => {
    // Force the sequence low, simulating a stale floor from the initial pass.
    await pg.exec("SELECT setval('quotations_number_seq', 100, true);");

    await recomputeSequenceFloors(pg);

    // Floor should be 5000 (from row "5000"); "PENDIENTE" ignored, no crash.
    // setval(seq, 5000, true) => next nextval = 5001.
    expect(await nextval("quotations_number_seq")).toBe("5001");
  });

  it("is idempotent: recomputing again with the same rows yields the same floor", async () => {
    // Reset low again and recompute twice; the second pass must not shift
    // the floor beyond MAX(numeric).
    await pg.exec("SELECT setval('quotations_number_seq', 100, true);");
    await recomputeSequenceFloors(pg);
    await recomputeSequenceFloors(pg);

    expect(await nextval("quotations_number_seq")).toBe("5001");
  });

  it("recomputes the work-order floor to its base when no numeric rows exist", async () => {
    // No work_orders rows were seeded, so the floor falls back to base-1
    // (109999) => next nextval = 110000.
    await pg.exec("SELECT setval('work_orders_number_seq', 5, true);");
    await recomputeSequenceFloors(pg);

    expect(await nextval("work_orders_number_seq")).toBe("110000");
  });
});
