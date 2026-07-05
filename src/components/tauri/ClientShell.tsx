"use client";

import * as React from "react";
import { ServerDiscoveryModal } from "@/components/tauri/ServerDiscoveryModal";
import { isTauriRuntime } from "@/lib/tauri/runtime";
import { serverUrlForClient } from "@/lib/tauri/commands";

type Props = {
  children: React.ReactNode;
};

/**
 * Wraps client-side children. When running inside a Tauri webview AND no
 * server URL has been configured yet, renders the first-run discovery modal
 * instead of children. In a regular browser, or once a URL is configured,
 * children render unchanged.
 */
export function ClientShell({ children }: Props) {
  const [needsConfig, setNeedsConfig] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (!isTauriRuntime()) {
      setNeedsConfig(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const url = await serverUrlForClient();
        if (!cancelled) setNeedsConfig(url === null);
      } catch {
        // If the command errors (e.g. Tauri command not yet registered),
        // fall through to showing the modal — that's the safe default.
        if (!cancelled) setNeedsConfig(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Don't render children until we know whether the modal is needed,
  // to avoid flashing app content on first run.
  if (needsConfig === null) return null;
  if (needsConfig) return <ServerDiscoveryModal />;
  return <>{children}</>;
}
