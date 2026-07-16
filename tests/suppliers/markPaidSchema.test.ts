import { describe, expect, it } from "vitest";
import { markPaidSchema } from "@/modules/suppliers/validations/markPaidSchema";

describe("markPaidSchema", () => {
  it("accepts an array of valid uuids", () => {
    const r = markPaidSchema.parse({
      ids: ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12"],
    });
    expect(r.ids).toHaveLength(2);
  });

  it("rejects an empty array", () => {
    expect(() => markPaidSchema.parse({ ids: [] })).toThrow(/al menos 1/i);
  });

  it("rejects more than 500 ids", () => {
    const ids = Array.from({ length: 501 }, () => crypto.randomUUID());
    expect(() => markPaidSchema.parse({ ids })).toThrow(/m[áa]ximo 500/i);
  });

  it("rejects non-uuid strings", () => {
    expect(() => markPaidSchema.parse({ ids: ["not-a-uuid"] })).toThrow();
  });

  it("rejects missing ids field", () => {
    expect(() => markPaidSchema.parse({})).toThrow();
  });
});
