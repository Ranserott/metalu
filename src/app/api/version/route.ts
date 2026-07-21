import { NextResponse } from "next/server";
import packageJson from "../../../../package.json";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const majorMinor = packageJson.version.split(".").slice(0, 2).join(".");

  return NextResponse.json({
    appVersion: packageJson.version,
    schemaVersion: "v2.0.0",
    compatibleVersion: `^${majorMinor}.`,
    runtime: process.env.METALU_RUNTIME === "tauri" ? "tauri" : "web",
  });
}
