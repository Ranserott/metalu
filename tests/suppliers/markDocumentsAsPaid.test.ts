import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma/prisma";
import { markDocumentsAsPaid } from "@/modules/suppliers/services/supplierDocumentService";

let supplierId: string;
let pendingId1: string;
let pendingId2: string;
let alreadyPaidId: string;

beforeAll(async () => {
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
