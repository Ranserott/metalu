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
    return NextResponse.json({ ok: true, ts: Date.now() });
  } catch (err) {
    console.error("[/api/health] db check failed:", err);
    return NextResponse.json(
      { ok: false, error: "db_unavailable" },
      { status: 503 }
    );
  }
}
