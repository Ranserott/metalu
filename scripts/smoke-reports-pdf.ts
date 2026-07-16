// scripts/smoke-reports-pdf.ts
// End-to-end smoke test for /api/reports/pdf (T11 of Reports PDF Export feature).
// Logs in as the seed admin, then hits the PDF endpoint for each of the 6
// report tabs. Saves PDFs to /tmp/metalu-reports-pdf/ and verifies each starts
// with the %PDF- magic bytes (i.e. is a real PDF, not an error JSON response).
//
// Usage: cd /Users/francisco/Desktop/metalu && npx tsx scripts/smoke-reports-pdf.ts

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const USERNAME = process.env.SMOKE_USERNAME ?? "admin";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "admin123";
const OUT_DIR = "/tmp/metalu-reports-pdf";

const TYPES = [
  "cartola",
  "pending-invoices",
  "sales",
  "payments",
  "credit-notes",
  "balances",
] as const;

type Cookie = { name: string; value: string };

function parseCookies(setCookieHeaders: string[]): Cookie[] {
  // NextAuth often returns duplicate Set-Cookie entries with the same name
  // (e.g. csrf-token from earlier session still in the jar). Keep only the
  // last value per name so the most recent cookie wins.
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
  // 1. Fetch CSRF token (NextAuth requires this for credentials POST).
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { redirect: "manual" });
  if (!csrfRes.ok) throw new Error(`CSRF fetch failed: ${csrfRes.status}`);
  const csrfBody = (await csrfRes.json()) as { csrfToken: string };
  const csrfCookies = parseCookies(
    (csrfRes.headers as any).getSetCookie?.() ?? []
  );

  // 2. POST credentials.
  const form = new URLSearchParams({
    csrfToken: csrfBody.csrfToken,
    username: USERNAME,
    password: PASSWORD,
    redirect: "false",
    callbackUrl: `${BASE}/reports`,
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
  const signinCookies = parseCookies(
    (signinRes.headers as any).getSetCookie?.() ?? []
  );
  const all = [...csrfCookies, ...signinCookies];

  // 3. Verify session works.
  const sessionRes = await fetch(`${BASE}/api/auth/session`, {
    headers: { cookie: cookieHeader(all) },
  });
  if (!sessionRes.ok) throw new Error(`Session check failed: ${sessionRes.status}`);
  const session = await sessionRes.json();
  if (!session?.user) {
    throw new Error("Login succeeded but /api/auth/session has no user");
  }
  return all;
}

async function fetchPdf(
  cookies: Cookie[],
  type: string,
  extra: Record<string, string> = {}
): Promise<{ ok: boolean; status: number; bytes?: number; isPdf?: boolean; error?: string }> {
  const params = new URLSearchParams({ type, ...extra });
  const res = await fetch(`${BASE}/api/reports/pdf?${params.toString()}`, {
    headers: { cookie: cookieHeader(cookies) },
  });
  const buf = Buffer.from(await res.arrayBuffer());
  const isPdf = buf.length > 4 && buf.subarray(0, 5).toString("ascii") === "%PDF-";
  if (isPdf) {
    const filename = `reporte-${type}${extra.clientId ? `-client-${extra.clientId.slice(0, 6)}` : ""}-${new Date().toISOString().slice(0, 10)}.pdf`;
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

  // Cartola needs a clientId; fetch any client first.
  const clientRes = await fetch(`${BASE}/api/clients?limit=1`, {
    headers: { cookie: cookieHeader(cookies) },
  });
  const clientJson = await clientRes.json();
  const firstClient = clientJson?.data?.[0] ?? clientJson?.[0];
  const clientId = firstClient?.id;

  let pass = 0;
  let fail = 0;
  for (const type of TYPES) {
    const extra: Record<string, string> = {};
    if (type === "cartola") {
      if (!clientId) {
        console.log(`[smoke] SKIP ${type} (no client in DB)`);
        continue;
      }
      extra.clientId = clientId;
    }
    const r = await fetchPdf(cookies, type, extra);
    const tag = r.ok ? "PASS" : "FAIL";
    console.log(
      `[smoke] ${tag} ${type.padEnd(18)} status=${r.status} bytes=${r.bytes ?? "?"} isPdf=${r.isPdf ?? false}` +
        (r.error ? ` err=${r.error.slice(0, 80)}` : "")
    );
    if (r.ok) pass++;
    else fail++;
  }

  console.log(`\n[smoke] ${pass} passed, ${fail} failed. PDFs in ${OUT_DIR}`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("[smoke] fatal:", e);
  process.exit(2);
});