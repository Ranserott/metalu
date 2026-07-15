// tests/reports/runReport.test.ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma/prisma";
import { runReport } from "@/modules/reports/services/reportService";

let clientId: string;
let clientCode = "TEST-RUN-REPORT";

beforeAll(async () => {
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