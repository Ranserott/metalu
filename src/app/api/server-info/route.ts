import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import os from "node:os";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.roles.includes("Admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    ip: getLocalIPv4(),
    port: Number(process.env.PORT ?? "3000"),
    hostname: os.hostname(),
    version: process.env.METALU_VERSION ?? "0.2.0",
    status: "ok",
    uptimeSeconds: Math.floor(process.uptime()),
  });
}
