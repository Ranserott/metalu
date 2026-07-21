import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("GET /api/version contract", () => {
  let GET: typeof import("@/app/api/version/route").GET;

  beforeAll(async () => {
    process.env.METALU_TEST_DATA_DIR = fs.mkdtempSync(
      path.join(os.tmpdir(), "metalu-version-contract-")
    );
    process.env.METALU_RUNTIME = "tauri";
    process.env.METALU_TEST_VERSION = "0.2.0";
    ({ GET } = await import("@/app/api/version/route"));
  });

  afterAll(() => {
    delete process.env.METALU_TEST_DATA_DIR;
    delete process.env.METALU_RUNTIME;
    delete process.env.METALU_TEST_VERSION;
  });

  it("returns the v2 compatibility contract", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.schemaVersion).toBe("v2.0.0");
    expect(body.runtime).toBe("tauri");
    expect(body.appVersion).toMatch(/^0\.2\.\d+$/);
    expect(body.compatibleVersion).toMatch(/^\^0\.2\.$/);
  });
});
