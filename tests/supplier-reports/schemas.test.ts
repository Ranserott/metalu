import { describe, expect, it } from "vitest";
import {
  supplierReportFiltersSchema,
  supplierReportTypeSchema,
} from "@/modules/suppliers-reports/validations/reportSchemas";

describe("supplierReportTypeSchema", () => {
  it("accepts the 3 valid types", () => {
    expect(supplierReportTypeSchema.parse("by-due-date")).toBe("by-due-date");
    expect(supplierReportTypeSchema.parse("by-supplier")).toBe("by-supplier");
    expect(supplierReportTypeSchema.parse("daily-summary")).toBe("daily-summary");
  });

  it("rejects unknown type", () => {
    expect(() => supplierReportTypeSchema.parse("foo")).toThrow();
  });
});

describe("supplierReportFiltersSchema", () => {
  it("accepts minimal type-only payload", () => {
    const result = supplierReportFiltersSchema.parse({ type: "by-due-date" });
    expect(result).toEqual({ type: "by-due-date" });
  });

  it("coerces from/to from ISO strings to Date", () => {
    const result = supplierReportFiltersSchema.parse({
      type: "daily-summary",
      from: "2026-01-01",
      to: "2026-12-31",
    });
    expect(result.from).toBeInstanceOf(Date);
    expect(result.to).toBeInstanceOf(Date);
  });

  it("rejects invalid uuid for supplierId", () => {
    expect(() =>
      supplierReportFiltersSchema.parse({ type: "by-due-date", supplierId: "not-uuid" })
    ).toThrow();
  });
});
