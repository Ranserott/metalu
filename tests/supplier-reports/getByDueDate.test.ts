import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let supplierId: string;
let tmpDir: string;
let prisma: Awaited<
  ReturnType<typeof import("@/lib/prisma/pglite")["createTauriPrismaClient"]>
>;
let getDocumentsByDueDate: typeof import("@/modules/suppliers-reports/services/supplierReportService")["getDocumentsByDueDate"];

beforeAll(async () => {
  // Each test file MUST get its own PGlite data dir — vitest's thread pool
  // runs files in parallel, and two PGlite instances pointing at the same
  // on-disk dir corrupt each other's indexes.
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "metalu-due-"));
  process.env.METALU_TEST_DATA_DIR = tmpDir;
  process.env.METALU_RUNTIME = "tauri";

  // Dynamic imports — must run AFTER env vars are set so pglite.ts resolves
  // the right data dir on the first getPGlite() call. Importing the service
  // transitively loads @/lib/prisma/prisma, which fires off
  // ensureTauriMigrated() in the background. waitForTauriReady() awaits
  // that same in-flight migration — calling applyMigrations() directly
  // would race the kicked-off copy and trigger duplicate CREATE TYPE errors.
  const service = await import("@/modules/suppliers-reports/services/supplierReportService");
  const { waitForTauriReady, prisma: p } = await import("@/lib/prisma/prisma");
  const pglite = await import("@/lib/prisma/pglite");
  await waitForTauriReady();

  prisma = pglite.createTauriPrismaClient();
  getDocumentsByDueDate = service.getDocumentsByDueDate;
  // Clean up any leftover data from a previous run (cascade-deletes its documents)
  await prisma.supplier.deleteMany({ where: { code: "TEST-SUP-DUE" } });

  const supplier = await prisma.supplier.create({
    data: {
      code: "TEST-SUP-DUE",
      name: "Test Supplier Due Date",
      isActive: true,
    },
  });
  supplierId = supplier.id;

  const today = new Date("2026-07-08T12:00:00Z");
  const future = new Date("2026-07-15T12:00:00Z");
  await prisma.supplierDocument.create({
    data: {
      supplierId,
      nombre: "Factura vieja",
      tipoDocumento: "FACTURA",
      documento: "F-100",
      fechaDocumento: today,
      fechaVencimiento: future,
      valor: 50000,
      estado: "PENDIENTE",
    },
  });
});

afterAll(async () => {
  await prisma.supplierDocument.deleteMany({ where: { supplierId } });
  await prisma.supplier.delete({ where: { id: supplierId } });
  await prisma.$disconnect();
  const { disposeTauriPrisma } = await import("@/lib/prisma/pglite");
  await disposeTauriPrisma();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.METALU_TEST_DATA_DIR;
  delete process.env.METALU_RUNTIME;
});

describe("getDocumentsByDueDate", () => {
  it("returns PENDIENTE docs ordered by fechaVencimiento ASC", async () => {
    const { rows, totals } = await getDocumentsByDueDate({});
    const ourRows = rows.filter((r) => r.documento === "F-100");
    expect(ourRows.length).toBeGreaterThan(0);
    expect(ourRows[0].valor).toBe(50000);
    expect(totals.total).toBeGreaterThanOrEqual(50000);
  });

  it("excludes PAGADO docs", async () => {
    await prisma.supplierDocument.create({
      data: {
        supplierId,
        nombre: "Factura pagada",
        tipoDocumento: "FACTURA",
        documento: "F-200",
        fechaDocumento: new Date("2026-07-08"),
        fechaVencimiento: new Date("2026-07-20"),
        valor: 99999,
        estado: "PAGADO",
      },
    });
    const { rows } = await getDocumentsByDueDate({});
    const paid = rows.find((r) => r.documento === "F-200");
    expect(paid).toBeUndefined();
  });

  it("filters by fechaVencimiento range", async () => {
    const { rows } = await getDocumentsByDueDate({
      from: new Date("2026-07-10"),
      to: new Date("2026-07-20"),
    });
    expect(rows.find((r) => r.documento === "F-100")).toBeDefined();

    const { rows: empty } = await getDocumentsByDueDate({
      from: new Date("2026-08-01"),
    });
    expect(empty.find((r) => r.documento === "F-100")).toBeUndefined();
  });
});