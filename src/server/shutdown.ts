type Cleanup = () => void | Promise<void>;

const cleanups: Cleanup[] = [];

export function onShutdown(fn: Cleanup): void {
  cleanups.push(fn);
}

let installed = false;

export function installShutdownHandlers(): void {
  if (installed) return;
  installed = true;
  const handle = async (signal: string) => {
    console.log(`[server] received ${signal}, shutting down...`);
    for (const fn of cleanups.reverse()) {
      try {
        await fn();
      } catch (e) {
        console.error("[server] cleanup error:", (e as Error).message);
      }
    }
    process.exit(0);
  };
  process.on("SIGINT", () => void handle("SIGINT"));
  process.on("SIGTERM", () => void handle("SIGTERM"));
}
