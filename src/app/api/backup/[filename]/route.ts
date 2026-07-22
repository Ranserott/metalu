import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import fs from "node:fs/promises";
import path from "node:path";
import { resolveDataDir } from "@/server/pglite-bootstrap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSafeFilename(name: string): boolean {
  return /^metalu-\d{4}-\d{2}-\d{2}\.pglitebackup$/.test(name);
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ filename: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.roles.includes("Admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { filename } = await ctx.params;
  if (!isSafeFilename(filename)) {
    return NextResponse.json({ error: "bad filename" }, { status: 400 });
  }

  const { backupsDir } = resolveDataDir();
  const fullPath = path.join(backupsDir, filename);
  const data = await fs.readFile(fullPath);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(data.length),
    },
  });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ filename: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.roles.includes("Admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { filename } = await ctx.params;
  if (!isSafeFilename(filename)) {
    return NextResponse.json({ error: "bad filename" }, { status: 400 });
  }

  const { backupsDir } = resolveDataDir();
  await fs.unlink(path.join(backupsDir, filename));
  return NextResponse.json({ ok: true });
}
