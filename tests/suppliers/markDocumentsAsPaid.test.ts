import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let supplierId: string;
let pendingId1: string;
let pendingId2: string;
let alreadyPaidId: string;
let tmpDir: string;
let prisma: Awaited<
  ReturnType<typeof import("@/lib/prisma/pglite")["createTauriPrismaClient"]>
>;
let markDocumentsAsPaid: typeof import("@/modules/suppliers/services/supplierDocumentService")["markDocumentsAsPaid"];

beforeAll(async () => {
  // Each test file MUST get its own PGlite data dir — vitest's thread pool
  // runs files in parallel, and two PGlite instances pointing at the same
  // on-disk dir corrupt each other's indexes (ErrnoError 20 / ENOTDIR or
  // "type already exists" when concurrent migrations race).
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "metalu-mp-"));
  process.env.METALU_TEST_DATA_DIR = tmpDir;
  process.env.METALU_RUNTIME = "tauri";

  // Dynamic imports — must run AFTER env vars are set so pglite.ts resolves
  // the right data dir on the first getPGlite() call. Importing the service
  // transitively loads @/lib/prisma/prisma, which fires off
  // ensureTauriMigrated() in the background. waitForTauriReady() awaits
  // that same in-flight migration — calling applyMigrations() directly
  // would race the kicked-off copy and trigger duplicate CREATE TYPE errors.
  const service = await import("@/modules/suppliers/services/supplierDocumentService");
  const { waitForTauriReady, prisma: p } = await import("@/lib/prisma/prisma");
  const pglite = await import("@/lib/prisma/pglite");
  await waitForTauriReady();

  prisma = pglite.createTauriPrismaClient();
  markDocumentsAsPaid = service.markDocumentsAsPaid;
  await prisma.supplier.deleteMany({ where: { code: "TEST-SUP-MP" } });
  const supplier = await prisma.supplier.create({
    data: { code: "TEST-SUP-MP", name: "Test Mark Paid", isActive: true },
  });
  supplierId = supplier.id;

  const today = new Date("2026-07-16T12:00:00Z");
  const future = new Date("2026-07-30T12:00:00Z");

  const a = await prisma.supplierDocument.create({
    data: {
      supplierId,
      nombre: "Doc pendiente A",
      tipoDocumento: "FACTURA",
      documento: "MP-A",
      fechaDocumento: today,
      fechaVencimiento: future,
      valor: 10000,
      estado: "PENDIENTE",
    },
  });
  const b = await prisma.supplierDocument.create({
    data: {
      supplierId,
      nombre: "Doc pendiente B",
      tipoDocumento: "FACTURA",
      documento: "MP-B",
      fechaDocumento: today,
      fechaVencimiento: future,
      valor: 20000,
      estado: "PENDIENTE",
    },
  });
  const c = await prisma.supplierDocument.create({
    data: {
      supplierId,
      nombre: "Doc ya pagado",
      tipoDocumento: "FACTURA",
      documento: "MP-C",
      fechaDocumento: today,
      fechaVencimiento: future,
      valor: 30000,
      estado: "PAGADO",
    },
  });
  pendingId1 = a.id;
  pendingId2 = b.id;
  alreadyPaidId = c.id;
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

describe("markDocumentsAsPaid", () => {
  it("returns { updated: 0 } for an empty array (no Prisma call needed)", async () => {
    const result = await markDocumentsAsPaid([]);
    expect(result).toEqual({ updated: 0 });
  });

  it("flips PENDIENTE docs to PAGADO and returns the count", async () => {
    const result = await markDocumentsAsPaid([pendingId1, pendingId2]);
    expect(result.updated).toBe(2);

    const a = await prisma.supplierDocument.findUnique({ where: { id: pendingId1 } });
    const b = await prisma.supplierDocument.findUnique({ where: { id: pendingId2 } });
    expect(a?.estado).toBe("PAGADO");
    expect(b?.estado).toBe("PAGADO");
  });

  it("is idempotent — already-paid ids are not re-updated and don't count", async () => {
    const result = await markDocumentsAsPaid([alreadyPaidId]);
    expect(result.updated).toBe(0);

    const c = await prisma.supplierDocument.findUnique({ where: { id: alreadyPaidId } });
    expect(c?.estado).toBe("PAGADO");
  });
});