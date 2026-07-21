import { NextResponse } from "next/server";
import { prisma, waitForTauriReady } from "@/lib/prisma/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    // On Tauri, block the request until PGlite has applied all migration
    // SQL files. The Rust shell polls this endpoint to know when the server
    // is ready to serve, so waiting here auto-gates startup on migration
    // completion.
    await waitForTauriReady();

    // Cheap query that confirms DB is reachable + schema migrated.
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, code: "ready", ts: Date.now() });
  } catch (err: unknown) {
    let code = "db_unavailable";
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      typeof err.code === "string"
    ) {
      code = err.code;
    }
    console.error("[/api/health] db check failed:", err);
    return NextResponse.json(
      { ok: false, code, ts: Date.now() },
      { status: 503 }
    );
  }
}
