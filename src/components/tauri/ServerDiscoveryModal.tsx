"use client";

import * as React from "react";
import {
  discoverServers,
  getClientConfig,
  setClientConfig,
  type DiscoveredServer,
} from "@/lib/tauri/commands";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Status = "idle" | "searching" | "found" | "not-found" | "error";

export function ServerDiscoveryModal() {
  const [url, setUrl] = React.useState("");
  const [savedUrl, setSavedUrl] = React.useState<string | null>(null);
  const [discovered, setDiscovered] = React.useState<DiscoveredServer | null>(null);
  const [status, setStatus] = React.useState<Status>("idle");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Load existing config on mount.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await getClientConfig();
        if (cancelled) return;
        if (cfg.server_url) {
          setSavedUrl(cfg.server_url);
          setUrl(cfg.server_url);
        }
      } catch (e) {
        // Tauri may not be reachable; we treat as "no config" silently on first run.
        if (!cancelled) setErrorMsg(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSearch() {
    setStatus("searching");
    setErrorMsg(null);
    setDiscovered(null);
    try {
      const result = await discoverServers(1500);
      if (result.found && result.server && result.url) {
        setDiscovered(result.server);
        setUrl(result.url);
        setStatus("found");
      } else {
        setStatus("not-found");
      }
    } catch (e) {
      setErrorMsg(String(e));
      setStatus("error");
    }
  }

  async function handleSave() {
    const trimmed = url.trim();
    if (!trimmed) return;
    try {
      await setClientConfig({ server_url: trimmed });
      setSavedUrl(trimmed);
    } catch (e) {
      setErrorMsg(String(e));
      setStatus("error");
    }
  }

  async function handleClear() {
    try {
      await setClientConfig({ server_url: null });
    } catch {
      // ignore — we'll just clear local state regardless
    }
    setSavedUrl(null);
    setUrl("");
    setDiscovered(null);
    setStatus("idle");
  }

  const alreadyConfigured = savedUrl !== null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="server-discovery-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg space-y-4">
        <div>
          <h2 id="server-discovery-title" className="text-lg font-semibold">
            {alreadyConfigured ? "Servidor configurado" : "Conectar a un servidor"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {alreadyConfigured
              ? "Esta instancia ya conoce un servidor. Puedes buscar otro o reingresar la URL."
              : "Busca un servidor Metalu en tu red local o ingresa la URL manualmente."}
          </p>
        </div>

        {alreadyConfigured && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="text-muted-foreground">URL actual</div>
            <div className="font-mono break-all">{savedUrl}</div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleSearch}
            disabled={status === "searching"}
          >
            {status === "searching" ? "Buscando…" : "Buscar server"}
          </Button>
        </div>

        {status === "found" && discovered && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="text-muted-foreground">Servidor encontrado</div>
            <div className="font-mono">
              {discovered.hostname} ({discovered.ip})
            </div>
          </div>
        )}
        {status === "not-found" && (
          <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm">
            No se encontró ningún servidor en la red. Ingresa la URL manualmente.
          </div>
        )}
        {status === "error" && errorMsg && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMsg}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="server-url" className="text-sm font-medium">
            URL del servidor
          </label>
          <Input
            id="server-url"
            type="url"
            placeholder="http://192.168.1.50:3000"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2">
          {alreadyConfigured && (
            <Button type="button" variant="ghost" onClick={handleClear}>
              Limpiar
            </Button>
          )}
          <Button type="button" onClick={handleSave} disabled={!url.trim()}>
            {alreadyConfigured ? "Actualizar" : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
