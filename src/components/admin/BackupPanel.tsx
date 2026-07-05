"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isTauriRuntime } from "@/lib/tauri/runtime";

/**
 * Admin panel exposed under /admin. Lets operators snapshot the local pglite
 * database on demand via POST /api/admin/backup. Reads the recent backup path
 * the API returned so the user can locate the file in their filesystem.
 *
 * Outside Tauri (regular browser / hosted preview), renders a clear
 * "Backup sólo disponible en instalación Tauri local" notice instead of a
 * button — the API rejects calls from non-tauri runtimes anyway, but hiding
 * the affordance avoids confusion.
 */
export function BackupPanel() {
  // Render synchronously from `isTauriRuntime()` — this is a hook into
  // `window.__TAURI_INTERNALS__` which is undefined on the server, and the
  // function returns false there. The initial paint in the browser will be
  // correct on hydration.
  const [enabled, setEnabled] = React.useState(false);
  React.useEffect(() => {
    setEnabled(isTauriRuntime());
  }, []);
  const isTauri = enabled;
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastBackupPath, setLastBackupPath] = React.useState<string | null>(null);

  const onExport = React.useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/backup", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const body = (await res.json()) as { file?: string };
      if (body.file) setLastBackupPath(body.file);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <Card data-size="sm">
      <CardHeader>
        <CardTitle>Respaldo de la base de datos</CardTitle>
        <CardDescription>
          Exporta la base de datos local (pglite) a un archivo con marca de
          tiempo. Mantén estos respaldos en un lugar seguro antes de
          actualizaciones importantes.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isTauri ? (
          <>
            <div className="flex items-center gap-3">
              <Button onClick={onExport} disabled={busy}>
                {busy ? "Creando respaldo…" : "Crear respaldo ahora"}
              </Button>
              {lastBackupPath ? (
                <span className="text-xs text-muted-foreground truncate font-mono">
                  Último: {lastBackupPath}
                </span>
              ) : null}
            </div>
            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Backup sólo disponible en instalación Tauri local.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
