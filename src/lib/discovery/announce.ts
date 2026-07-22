import dgram from "node:dgram";
import os from "node:os";
import { buildDiscoveryPayload } from "./payload";

export interface AnnouncerConfig {
  port: number;
  hostname: string;
  version: string;
  intervalMs: number;
}

export interface AnnouncerHandle {
  stop: () => void;
}

function getLocalIPv4(): string {
  const interfaces = os.networkInterfaces();
  for (const list of Object.values(interfaces)) {
    if (!list) continue;
    for (const ni of list) {
      if (ni.family === "IPv4" && !ni.internal) {
        return ni.address;
      }
    }
  }
  return "127.0.0.1";
}

export function startAnnouncer(config: AnnouncerConfig): AnnouncerHandle {
  const discoveryPort = Number(process.env.METALU_DISCOVERY_PORT ?? "3001");
  const socket = dgram.createSocket("udp4");
  socket.on("error", (err) => {
    console.error("[discovery] socket error:", err.message);
  });

  const ip = getLocalIPv4();
  const payload = buildDiscoveryPayload({
    ip,
    port: config.port,
    hostname: config.hostname,
    version: config.version,
  });
  const msg = Buffer.from(JSON.stringify(payload), "utf8");

  const broadcast = () => {
    socket.send(msg, discoveryPort, "255.255.255.255", (err) => {
      if (err) console.error("[discovery] send error:", err.message);
    });
  };

  socket.bind(0, "0.0.0.0", () => {
    socket.setBroadcast(true);
    broadcast();
  });

  const timer = setInterval(broadcast, config.intervalMs);

  return {
    stop: () => {
      clearInterval(timer);
      socket.close();
    },
  };
}

export function stopAnnouncer(handle: AnnouncerHandle): void {
  handle.stop();
}