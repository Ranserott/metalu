import os from "node:os";
import next from "next";
import { startAnnouncer, type AnnouncerHandle } from "@/lib/discovery/announce";
import { resolveDataDir } from "@/server/pglite-bootstrap";
import { installShutdownHandlers, onShutdown } from "@/server/shutdown";

const PORT = Number(process.env.PORT ?? "3000");
const HOST = process.env.HOSTNAME ?? "0.0.0.0";
const VERSION = process.env.METALU_VERSION ?? "0.2.0";
const INTERVAL = Number(process.env.METALU_DISCOVERY_INTERVAL_MS ?? "5000");

async function main() {
  const dirs = resolveDataDir();
  console.log(`[server] data dir: ${dirs.dataDir}`);

  installShutdownHandlers();

  const app = next({ dev: false, hostname: HOST, port: PORT });
  const handle = app.getRequestHandler();
  await app.prepare();

  const server = app as unknown as {
    listen: (port: number, host: string) => Promise<void>;
  };

  await server.listen(PORT, HOST);
  console.log(`[server] Next.js listening on http://${HOST}:${PORT}`);

  const announcer: AnnouncerHandle = startAnnouncer({
    port: PORT,
    hostname: os.hostname(),
    version: VERSION,
    intervalMs: INTERVAL,
  });
  console.log(`[server] UDP announcer broadcasting on :3001 every ${INTERVAL}ms`);

  onShutdown(() => announcer.stop());
}

main().catch((err) => {
  console.error("[server] fatal:", err);
  process.exit(1);
});
