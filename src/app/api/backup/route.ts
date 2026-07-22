import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { exportBackup, listBackups } from "@/lib/backup/export";
import { resolveDataDir } from "@/server/pglite-bootstrap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.roles.includes("Admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { backupsDir } = resolveDataDir();
    const result = await exportBackup(backupsDir);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[api/backup] export error:", e);
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.roles.includes("Admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { backupsDir } = resolveDataDir();
  const list = await listBackups(backupsDir);
  return NextResponse.json({ backups: list });
}
