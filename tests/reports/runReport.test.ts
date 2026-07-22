// tests/reports/runReport.test.ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let clientId: string;
let clientCode = "TEST-RUN-REPORT";
let tmpDir: string;
let prisma: Awaited<
  ReturnType<typeof import("@/lib/prisma/pglite")["createTauriPrismaClient"]>
>;
let runReport: typeof import("@/modules/reports/services/reportService")["runReport"];

beforeAll(async () => {
  // Each test file MUST get its own PGlite data dir — vitest's thread pool
  // runs files in parallel, and two PGlite instances pointing at the same
  // on-disk dir corrupt each other's indexes.
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "metalu-run-report-"));
  process.env.METALU_TEST_DATA_DIR = tmpDir;
  process.env.METALU_RUNTIME = "tauri";

  // Dynamic imports — must run AFTER env vars are set so pglite.ts resolves
  // the right data dir on the first getPGlite() call. Importing the service
  // transitively loads @/lib/prisma/prisma, which fires off
  // ensureTauriMigrated() in the background. waitForTauriReady() awaits
  // that same in-flight migration — calling applyMigrations() directly
  // would race the kicked-off copy and trigger duplicate CREATE TYPE errors.
  const service = await import("@/modules/reports/services/reportService");
  const { waitForTauriReady, prisma: p } = await import("@/lib/prisma/prisma");
  const pglite = await import("@/lib/prisma/pglite");
  await waitForTauriReady();

  prisma = pglite.createTauriPrismaClient();
  runReport = service.runReport;
  await prisma.client.deleteMany({ where: { code: clientCode } });
  const client = await prisma.client.create({
    data: {
      code: clientCode,
      name: "Test Client Run Report",
      isActive: true,
    },
  });
  clientId = client.id;
});

afterAll(async () => {
  await prisma.client.deleteMany({ where: { code: clientCode } });
  await prisma.$disconnect();
  const { disposeTauriPrisma } = await import("@/lib/prisma/pglite");
  await disposeTauriPrisma();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.METALU_TEST_DATA_DIR;
  delete process.env.METALU_RUNTIME;
});

describe("runReport", () => {
  it("throws on unknown type", async () => {
    await expect(
      runReport("nope" as any, {})
    ).rejects.toThrow(/tipo de reporte inválido/i);
  });

  it("returns cartola rows + totals when clientId provided", async () => {
    const result = await runReport("cartola", { clientId });
    expect(result).toHaveProperty("rows");
    expect(result).toHaveProperty("totals");
    expect(result.totals).toHaveProperty("cargos");
    expect(result.totals).toHaveProperty("abonos");
    expect(result.totals).toHaveProperty("saldoFinal");
  });

  it("returns sales rows + totals with optional clientId", async () => {
    const result = await runReport("sales", {});
    expect(Array.isArray(result.rows)).toBe(true);
    expect(result.totals).toHaveProperty("neto");
    expect(result.totals).toHaveProperty("iva");
    expect(result.totals).toHaveProperty("total");
  });

  it("returns balances rows + totals", async () => {
    const result = await runReport("balances", {});
    expect(Array.isArray(result.rows)).toBe(true);
    expect(result.totals).toHaveProperty("saldoActual");
  });
});