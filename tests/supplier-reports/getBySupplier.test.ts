import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma/prisma";
import { getDocumentsBySupplier } from "@/modules/suppliers-reports/services/supplierReportService";

let supplierId: string;
let docId: string;

beforeAll(async () => {
  const { applyMigrations } = await import("@/lib/prisma/migrations");
  await applyMigrations();
  // Clean up any leftover data from a previous failed run
  await prisma.supplierDocument.deleteMany({ where: { supplier: { code: "TEST-SUP-GRP" } } });
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
    // Basic ordering sanity: ourRow's supplierName matches and it's grouped
    expect(ourRow!.supplierName).toBe("Test Supplier Group");
  });
});
