// scripts/smoke-suppliers-reports-pdf.ts
// End-to-end smoke test for /api/suppliers/reports/pdf (T17 of Reports PDF
// Export feature). Mirrors scripts/smoke-reports-pdf.ts but hits the supplier
// reports endpoint with the 3 supplier report types.
//
// Usage: cd /Users/francisco/Desktop/metalu && npx tsx scripts/smoke-suppliers-reports-pdf.ts

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const USERNAME = process.env.SMOKE_USERNAME ?? "admin";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "admin123";
const OUT_DIR = "/tmp/metalu-suppliers-reports-pdf";

const TYPES = ["by-due-date", "by-supplier", "daily-summary"] as const;

type Cookie = { name: string; value: string };

function parseCookies(setCookieHeaders: string[]): Cookie[] {
  const byName = new Map<string, string>();
  for (const header of setCookieHeaders) {
    const [pair] = header.split(";");
    const [name, ...rest] = pair.split("=");
    if (!name || rest.length === 0) continue;
    byName.set(name.trim(), rest.join("=").trim());
  }
  return Array.from(byName, ([name, value]) => ({ name, value }));
}

function cookieHeader(cookies: Cookie[]): string {
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function login(): Promise<Cookie[]> {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { redirect: "manual" });
  if (!csrfRes.ok) throw new Error(`CSRF fetch failed: ${csrfRes.status}`);
  const csrfBody = (await csrfRes.json()) as { csrfToken: string };
  const csrfCookies = parseCookies((csrfRes.headers as any).getSetCookie?.() ?? []);

  const form = new URLSearchParams({
    csrfToken: csrfBody.csrfToken,
    username: USERNAME,
    password: PASSWORD,
    redirect: "false",
    callbackUrl: `${BASE}/suppliers/reports`,
    json: "true",
  });
  const signinRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: cookieHeader(csrfCookies),
    },
    body: form.toString(),
    redirect: "manual",
  });
  const signinCookies = parseCookies((signinRes.headers as any).getSetCookie?.() ?? []);
  const all = [...csrfCookies, ...signinCookies];

  const sessionRes = await fetch(`${BASE}/api/auth/session`, {
    headers: { cookie: cookieHeader(all) },
  });
  if (!sessionRes.ok) throw new Error(`Session check failed: ${sessionRes.status}`);
  const session = await sessionRes.json();
  if (!session?.user) throw new Error("Login succeeded but /api/auth/session has no user");
  return all;
}

async function fetchPdf(
  cookies: Cookie[],
  type: string,
  extra: Record<string, string> = {}
): Promise<{ ok: boolean; status: number; bytes?: number; isPdf?: boolean; error?: string }> {
  const params = new URLSearchParams({ type, ...extra });
  const res = await fetch(`${BASE}/api/suppliers/reports/pdf?${params.toString()}`, {
    headers: { cookie: cookieHeader(cookies) },
  });
  const buf = Buffer.from(await res.arrayBuffer());
  const isPdf = buf.length > 4 && buf.subarray(0, 5).toString("ascii") === "%PDF-";
  if (isPdf) {
    const filename = `suppliers-${type}-${new Date().toISOString().slice(0, 10)}.pdf`;
    await writeFile(join(OUT_DIR, filename), buf);
  }
  return {
    ok: res.ok && isPdf,
    status: res.status,
    bytes: buf.length,
    isPdf,
    error: res.ok ? undefined : buf.toString("utf-8").slice(0, 200),
  };
}

async function main() {
  console.log(`[smoke] base=${BASE} user=${USERNAME}`);
  await mkdir(OUT_DIR, { recursive: true });
  const cookies = await login();
  console.log(`[smoke] logged in (${cookies.length} cookies)`);

  let pass = 0;
  let fail = 0;
  for (const type of TYPES) {
    const r = await fetchPdf(cookies, type);
    const tag = r.ok ? "PASS" : "FAIL";
    console.log(
      `[smoke] ${tag} ${type.padEnd(18)} status=${r.status} bytes=${r.bytes ?? "?"} isPdf=${r.isPdf ?? false}` +
        (r.error ? ` err=${r.error.slice(0, 80)}` : "")
    );
    if (r.ok) pass++;
    else fail++;
  }

  // Bonus: invalid type returns 400.
  const invalid = await fetchPdf(cookies, "nope-this-doesnt-exist");
  const invalidOk = invalid.status === 400;
  console.log(
    `[smoke] ${invalidOk ? "PASS" : "FAIL"} invalid-type-400         status=${invalid.status} expected=400`
  );
  if (invalidOk) pass++;
  else fail++;

  console.log(`\n[smoke] ${pass} passed, ${fail} failed. PDFs in ${OUT_DIR}`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("[smoke] fatal:", e);
  process.exit(2);
});