import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
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