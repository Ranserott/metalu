import { describe, expect, it } from "vitest";

const BASE = process.env.TEST_API_BASE ?? "http://localhost:3000";

// Requires a running server. Skipped by default; enable manually for local
// smoke tests or for the CI smoke job that boots metalu-server.exe before
// running this file.
describe.skip("API endpoints", () => {
  it("/api/health is reachable", async () => {
    const r = await fetch(`${BASE}/api/health`);
    expect([200, 401, 403]).toContain(r.status);
  });

  it("/api/version is reachable", async () => {
    const r = await fetch(`${BASE}/api/version`);
    expect([200, 401, 403]).toContain(r.status);
  });

  it("/api/server-info requires admin auth", async () => {
    const r = await fetch(`${BASE}/api/server-info`);
    expect([401, 403]).toContain(r.status);
  });
});