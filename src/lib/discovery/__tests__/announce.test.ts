import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const socketInstances: FakeSocket[] = [];

class FakeSocket {
  public sent: Array<{ msg: Buffer; port: number; address: string }> = [];
  public bound = false;
  public closed = false;
  public broadcast = vi.fn();

  on(_event: string, _cb: (...args: unknown[]) => void) {
    // No-op for tests
  }

  bind(port: number, address: string, cb?: () => void) {
    this.bound = true;
    (this as unknown as { _port: number; _address: string })._port = port;
    (this as unknown as { _port: number; _address: string })._address = address;
    if (cb) cb();
  }

  send(msg: Buffer, port: number, address: string, cb?: (err?: Error) => void) {
    this.sent.push({ msg, port, address });
    if (cb) cb();
  }

  setBroadcast(v: boolean) {
    this.broadcast(v);
  }

  close(cb?: () => void) {
    this.closed = true;
    if (cb) cb();
  }
}

vi.mock("dgram", () => ({
  default: {
    createSocket: () => {
      const s = new FakeSocket();
      socketInstances.push(s);
      return s;
    },
  },
}));

vi.mock("node:os", () => ({
  default: {
    networkInterfaces: () => ({
      "Wi-Fi": [
        {
          address: "192.168.1.5",
          family: "IPv4",
          internal: false,
          netmask: "255.255.255.0",
        } as NodeJS.NetworkInterfaceInfo,
      ],
      "Loopback": [
        {
          address: "127.0.0.1",
          family: "IPv4",
          internal: true,
          netmask: "255.255.255.0",
        } as NodeJS.NetworkInterfaceInfo,
      ],
    }),
  },
}));

beforeEach(() => {
  socketInstances.length = 0;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("startAnnouncer", () => {
  it("broadcasts payload immediately on start", async () => {
    const { startAnnouncer, stopAnnouncer } = await import("../announce");
    const handle = startAnnouncer({
      port: 3000,
      hostname: "taller-pc",
      version: "0.2.0",
      intervalMs: 5000,
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(socketInstances).toHaveLength(1);
    expect(socketInstances[0].sent).toHaveLength(1);
    expect(socketInstances[0].sent[0].address).toBe("255.255.255.255");
    expect(socketInstances[0].sent[0].port).toBe(3001);
    const json = JSON.parse(socketInstances[0].sent[0].msg.toString());
    expect(json).toEqual({
      ip: "192.168.1.5",
      port: 3000,
      hostname: "taller-pc",
      version: "0.2.0",
    });
    stopAnnouncer(handle);
  });

  it("broadcasts every intervalMs", async () => {
    const { startAnnouncer, stopAnnouncer } = await import("../announce");
    const handle = startAnnouncer({
      port: 3000,
      hostname: "x",
      version: "0.2.0",
      intervalMs: 5000,
    });
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(5000);
    expect(socketInstances[0].sent).toHaveLength(3);
    stopAnnouncer(handle);
  });

  it("stops broadcasting after stopAnnouncer", async () => {
    const { startAnnouncer, stopAnnouncer } = await import("../announce");
    const handle = startAnnouncer({
      port: 3000,
      hostname: "x",
      version: "0.2.0",
      intervalMs: 5000,
    });
    await vi.advanceTimersByTimeAsync(0);
    stopAnnouncer(handle);
    await vi.advanceTimersByTimeAsync(10000);
    expect(socketInstances[0].sent).toHaveLength(1);
    expect(socketInstances[0].closed).toBe(true);
  });

  it("uses custom discovery port from env", async () => {
    process.env.METALU_DISCOVERY_PORT = "4001";
    const { startAnnouncer, stopAnnouncer } = await import("../announce");
    const handle = startAnnouncer({
      port: 3000,
      hostname: "x",
      version: "0.2.0",
      intervalMs: 5000,
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(socketInstances[0].sent[0].port).toBe(4001);
    stopAnnouncer(handle);
    delete process.env.METALU_DISCOVERY_PORT;
  });
});