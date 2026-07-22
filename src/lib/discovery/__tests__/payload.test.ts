import { describe, expect, it } from "vitest";
import { parseDiscoveryPayload, buildDiscoveryPayload } from "../payload";

describe("buildDiscoveryPayload", () => {
  it("builds a valid payload with required fields", () => {
    const p = buildDiscoveryPayload({
      ip: "192.168.1.5",
      port: 3000,
      hostname: "taller-pc",
      version: "0.2.0",
    });
    expect(p).toEqual({
      ip: "192.168.1.5",
      port: 3000,
      hostname: "taller-pc",
      version: "0.2.0",
    });
  });
});

describe("parseDiscoveryPayload", () => {
  it("parses a valid payload", () => {
    const json = '{"ip":"192.168.1.5","port":3000,"hostname":"taller-pc","version":"0.2.0"}';
    const p = parseDiscoveryPayload(json);
    expect(p).toEqual({
      ip: "192.168.1.5",
      port: 3000,
      hostname: "taller-pc",
      version: "0.2.0",
    });
  });

  it("rejects malformed JSON", () => {
    expect(() => parseDiscoveryPayload("not-json")).toThrow(/json/i);
  });

  it("rejects payload missing ip", () => {
    const json = '{"port":3000,"hostname":"taller-pc","version":"0.2.0"}';
    expect(() => parseDiscoveryPayload(json)).toThrow(/ip/i);
  });

  it("rejects payload with non-string hostname", () => {
    const json = '{"ip":"1.2.3.4","port":3000,"hostname":123,"version":"0.2.0"}';
    expect(() => parseDiscoveryPayload(json)).toThrow(/hostname/i);
  });

  it("rejects payload with out-of-range port", () => {
    const json = '{"ip":"1.2.3.4","port":99999,"hostname":"x","version":"0.2.0"}';
    expect(() => parseDiscoveryPayload(json)).toThrow(/port/i);
  });

  it("rejects payload with non-semver version", () => {
    const json = '{"ip":"1.2.3.4","port":3000,"hostname":"x","version":"abc"}';
    expect(() => parseDiscoveryPayload(json)).toThrow(/version/i);
  });
});
