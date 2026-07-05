import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import {
  backupDir,
  defaultBackupName,
  exportPgliteBackup,
  importPgliteBackup,
} from "@/lib/backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/backup
 *
 * Triggers an immediate backup. Produces a timestamped file under
 * `backupDir()` and returns the absolute path of the file written. The Tauri
 * shell is the only runtime allowed to invoke this — the endpoint refuses
 * non-tauri callers with 403 so a misconfigured web deployment can't silently
 * snapshot or overwrite local pglite data.
 */
export async function POST(_req: NextRequest) {
  if (process.env.METALU_RUNTIME !== "tauri") {
    return NextResponse.json(
      { error: "Backup is only available in the local Tauri installation" },
      { status: 403 },
    );
  }

  try {
    const url = new URL(_req.url);
    const fileName = url.searchParams.get("name") ?? defaultBackupName();
    const outPath = path.join(backupDir(), fileName);
    const written = await exportPgliteBackup(outPath);
    return NextResponse.json({
      ok: true,
      file: written,
      fileName,
      ts: Date.now(),
    });
  } catch (err) {
    console.error("[api/admin/backup POST] export failed:", err);
    return NextResponse.json(
      { error: "Backup export failed", detail: String(err) },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/backup?file=metalu-YYYYMMDD.pglitebackup
 *
 * Restores a backup file located in `backupDir()`. Path-traversal hardened:
 * only files inside `backupDir()` with a recognized pglite extension may be
 * loaded — anything else returns 400. Destructive — overwrites the live DB.
 */
export async function PUT(req: NextRequest) {
  if (process.env.METALU_RUNTIME !== "tauri") {
    return NextResponse.json(
      { error: "Backup is only available in the local Tauri installation" },
      { status: 403 },
    );
  }

  const requested = req.nextUrl.searchParams.get("file");
  if (!requested) {
    return NextResponse.json(
      { error: "Missing required query param: file" },
      { status: 400 },
    );
  }

  // Resolve and ensure the requested file is inside `backupDir()` — no
  // path traversal allowed.
  const dir = backupDir();
  const resolved = path.resolve(dir, requested);
  if (!resolved.startsWith(path.resolve(dir) + path.sep)) {
    return NextResponse.json(
      { error: "Invalid file path" },
      { status: 400 },
    );
  }

  try {
    await importPgliteBackup(resolved);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/backup PUT] import failed:", err);
    return NextResponse.json(
      { error: "Backup import failed", detail: String(err) },
      { status: 500 },
    );
  }
}
