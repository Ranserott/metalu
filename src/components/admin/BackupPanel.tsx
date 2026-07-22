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

/**
 * Admin panel exposed under /admin. Lets operators snapshot the local pglite
 * database on demand via POST /api/admin/backup. Reads the recent backup path
 * the API returned so the user can locate the file in their filesystem.
 *
 * The button only renders when /api/version reports a non-web runtime
 * (the desktop pglite mode that gates /api/admin/backup). The API rejects
 * calls from web runtimes with 403 — we hide the affordance proactively so
 * admins on hosted deployments don't see a broken button.
 */
export function BackupPanel() {
  const [desktopMode, setDesktopMode] = React.useState<boolean | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastBackupPath, setLastBackupPath] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/version");
        if (!res.ok) {
          if (!cancelled) setDesktopMode(false);
          return;
        }
        const body = (await res.json()) as { runtime?: string };
        if (!cancelled) setDesktopMode(body.runtime !== "web");
      } catch {
        if (!cancelled) setDesktopMode(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        {desktopMode === null ? null : desktopMode ? (
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
            Backup sólo disponible en instalación de escritorio local.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
