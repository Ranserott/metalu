// Detect whether we're running inside a Tauri webview.
// In a Tauri shell the Tauri runtime injects `__TAURI_INTERNALS__` on `window`.
export function isTauriRuntime(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window;
}
