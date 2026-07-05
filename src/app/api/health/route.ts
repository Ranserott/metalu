import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/prisma";

export const dynamic = "force-dynamic";
export const runtime = process.env.METALU_RUNTIME === "tauri" ? "nodejs" : "nodejs";

export async function GET() {
  try {
    // Cheap query that confirms DB is reachable + schema migrated.
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, ts: Date.now() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 503 }
    );
  }
}