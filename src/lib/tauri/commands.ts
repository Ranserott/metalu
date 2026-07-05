// Typed wrappers around the Tauri command surface exposed by `metalu_lib::commands`.
// In a browser context (no Tauri) these functions throw — callers should check
// `isTauriRuntime()` first (typically via `ClientShell`).

import { invoke } from "@tauri-apps/api/core";

export type DiscoveredServer = {
  ip: string;
  hostname: string;
  port: number;
};

export type DiscoveryResult = {
  found: boolean;
  server: DiscoveredServer | null;
  url: string | null;
};

export type ClientConfig = {
  server_url: string | null;
};

export function discoverServers(timeoutMs: number): Promise<DiscoveryResult> {
  return invoke<DiscoveryResult>("discover_servers", { timeoutMs });
}

export function getClientConfig(): Promise<ClientConfig> {
  return invoke<ClientConfig>("get_client_config");
}

export function setClientConfig(config: ClientConfig): Promise<void> {
  return invoke<void>("set_client_config", { config });
}

export function serverUrlForClient(): Promise<string | null> {
  return invoke<string | null>("server_url_for_client");
}
