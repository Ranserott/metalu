// Runs Next.js dev mode AND the UDP announcer in parallel, so devs can test
// discovery from a Tauri client without building the PKG bundle.

import { spawn } from "node:child_process";
import os from "node:os";
import { startAnnouncer } from "../src/lib/discovery/announce";

const PORT = Number(process.env.PORT ?? "3000");
const VERSION = process.env.METALU_VERSION ?? "0.2.0";

console.log("[dev] arrancando Next.js dev server...");
const next = spawn("npx", ["next", "dev", "--port", String(PORT)], {
  stdio: "inherit",
  env: { ...process.env, PORT: String(PORT) },
});

const announcer = startAnnouncer({
  port: PORT,
  hostname: os.hostname(),
  version: VERSION,
  intervalMs: 5000,
});
console.log(`[dev] UDP announcer en :3001 → http://localhost:${PORT}`);

const cleanup = () => {
  announcer.stop();
  next.kill("SIGTERM");
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
