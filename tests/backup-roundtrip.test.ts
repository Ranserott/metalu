import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { PGlite } from "@electric-sql/pglite";

describe("backup roundtrip", () => {
  let workDir: string;
  let sourceDb: PGlite;
  let sourceDir: string;
  let targetDir: string;

  beforeAll(async () => {
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), "metalu-backup-test-"));
    sourceDir = path.join(workDir, "source");
    targetDir = path.join(workDir, "target");
    await fs.mkdir(sourceDir, { recursive: true });
    await fs.mkdir(targetDir, { recursive: true });

    sourceDb = new PGlite(sourceDir);
    await sourceDb.exec(`
      CREATE TABLE items (id SERIAL PRIMARY KEY, name TEXT);
      INSERT INTO items (name) VALUES ('alpha'), ('beta'), ('gamma');
    `);
  }, 30000);

  afterAll(async () => {
    // sourceDb is closed inside the test before loading into the target,
    // so guard against a double-close (PGlite throws "PGlite is closed").
    if (!sourceDb.closed) {
      await sourceDb.close();
    }
    await fs.rm(workDir, { recursive: true, force: true });
  });

  it("dumpDataDir → new PGlite(loadDataDir) preserves data", async () => {
    const blob = await sourceDb.dumpDataDir();
    const buf = Buffer.from(await blob.arrayBuffer());

    await sourceDb.close();

    const file = new File([buf], "backup.tar", { type: "application/x-tar" });
    const targetDb = new PGlite(targetDir, { loadDataDir: file });
    await targetDb.waitReady;

    const rows = await targetDb.query<{ name: string }>(
      "SELECT name FROM items ORDER BY name",
    );
    expect(rows.rows.map((r) => r.name)).toEqual(["alpha", "beta", "gamma"]);

    await targetDb.close();
  }, 30000);
});
