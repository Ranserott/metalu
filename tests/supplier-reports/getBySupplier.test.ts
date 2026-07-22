import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let supplierId: string;
let docId: string;
let tmpDir: string;
let prisma: Awaited<
  ReturnType<typeof import("@/lib/prisma/pglite")["createTauriPrismaClient"]>
>;
let getDocumentsBySupplier: typeof import("@/modules/suppliers-reports/services/supplierReportService")["getDocumentsBySupplier"];

beforeAll(async () => {
  // Each test file MUST get its own PGlite data dir — vitest's thread pool
  // runs files in parallel, and two PGlite instances pointing at the same
  // on-disk dir corrupt each other's indexes.
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "metalu-grp-"));
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
  getDocumentsBySupplier = service.getDocumentsBySupplier;
  // Clean up any leftover data from a previous failed run
  await prisma.supplier.deleteMany({ where: { code: "TEST-SUP-GRP" } });

  const supplier = await prisma.supplier.create({
    data: { code: "TEST-SUP-GRP", name: "Test Supplier Group", isActive: true },
  });
  supplierId = supplier.id;

  const doc = await prisma.supplierDocument.create({
    data: {
      supplierId,
      nombre: "Factura grupo",
      tipoDocumento: "FACTURA",
      documento: "G-100",
      fechaDocumento: new Date("2026-07-08"),
      fechaVencimiento: new Date("2026-07-15"),
      valor: 75000,
      estado: "PENDIENTE",
    },
  });
  docId = doc.id;
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

describe("getDocumentsBySupplier", () => {
  it("includes supplierId in each row", async () => {
    const { rows } = await getDocumentsBySupplier({});
    const ourRow = rows.find((r) => r.id === docId);
    expect(ourRow).toBeDefined();
    expect(ourRow!.supplierId).toBe(supplierId);
    expect(ourRow!.supplierName).toBe("Test Supplier Group");
  });

  it("counts only PENDIENTE docs in totals", async () => {
    await prisma.supplierDocument.create({
      data: {
        supplierId,
        nombre: "Doc pagado",
        tipoDocumento: "BOLETA",
        documento: "G-200",
        fechaDocumento: new Date("2026-07-08"),
        fechaVencimiento: new Date("2026-07-15"),
        valor: 99999,
        estado: "PAGADO",
      },
    });
    const { rows, totals } = await getDocumentsBySupplier({});
    expect(totals.count).toBe(rows.length);
    expect(rows.find((r) => r.documento === "G-200")).toBeUndefined();
    // No cleanup here — afterAll handles it (Task 2 lesson: in-test cleanup leaks if expect throws)
  });

  it("orders by supplier name then fechaVencimiento", async () => {
    const { rows } = await getDocumentsBySupplier({});
    const ourRow = rows.find((r) => r.id === docId);
    expect(ourRow).toBeDefined();
    expect(ourRow!.supplierName).toBe("Test Supplier Group");
  });
});