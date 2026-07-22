import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { restoreBackup } from "@/lib/backup/restore";
import { resolveDataDir } from "@/server/pglite-bootstrap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.roles.includes("Admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing file" }, { status: 400 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());

  try {
    const { backupsDir, dbDir } = resolveDataDir();
    const result = await restoreBackup(bytes, { dbDir, backupsDir });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[api/backup/restore] error:", e);
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
