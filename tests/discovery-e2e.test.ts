import { afterAll, beforeAll, describe, expect, it } from "vitest";
import dgram from "node:dgram";
import { buildDiscoveryPayload, parseDiscoveryPayload } from "../src/lib/discovery/payload";

describe("discovery e2e", () => {
  let listenerA: dgram.Socket;
  let listenerB: dgram.Socket;
  let messagesA: Array<{ msg: string; addr: string }> = [];
  let messagesB: Array<{ msg: string; addr: string }> = [];

  beforeAll(async () => {
    listenerA = dgram.createSocket("udp4");
    listenerB = dgram.createSocket("udp4");
    await new Promise<void>((r) => listenerA.bind(4001, "0.0.0.0", r));
    await new Promise<void>((r) => listenerB.bind(4002, "0.0.0.0", r));
    listenerA.on("message", (msg, rinfo) => messagesA.push({ msg: msg.toString(), addr: rinfo.address }));
    listenerB.on("message", (msg, rinfo) => messagesB.push({ msg: msg.toString(), addr: rinfo.address }));
  });

  afterAll(() => {
    listenerA.close();
    listenerB.close();
  });

  it("listeners receive cross-broadcast and parse payload", async () => {
    const sender = dgram.createSocket("udp4");
    await new Promise<void>((r) => sender.bind(0, "0.0.0.0", r));
    sender.setBroadcast(true);

    const payload = buildDiscoveryPayload({
      ip: "10.0.0.5",
      port: 3000,
      hostname: "test-host",
      version: "0.2.0",
    });
    const msg = Buffer.from(JSON.stringify(payload), "utf8");

    // Note: in localhost, broadcast usually hits only same interface. Use unicast
    // loopback to simulate cross-receiver behavior in CI.
    sender.send(msg, 4001, "127.0.0.1");
    sender.send(msg, 4002, "127.0.0.1");

    await new Promise((r) => setTimeout(r, 200));

    expect(messagesA).toHaveLength(1);
    expect(messagesB).toHaveLength(1);

    const parsedA = parseDiscoveryPayload(messagesA[0].msg);
    expect(parsedA.ip).toBe("10.0.0.5");
    expect(parsedA.version).toBe("0.2.0");

    sender.close();
  });
});
