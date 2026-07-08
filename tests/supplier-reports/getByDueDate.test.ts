import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma/prisma";
import { getDocumentsByDueDate } from "@/modules/suppliers-reports/services/supplierReportService";

let supplierId: string;

beforeAll(async () => {
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