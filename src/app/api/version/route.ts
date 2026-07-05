import { NextResponse } from "next/server";
import packageJson from "../../../../package.json";

export const dynamic = "force-dynamic";

export async function GET() {
  // schemaVersion = latest migration filename or a static string for v1.
  // For v1, hardcode a version stamp; bumping when migrations change is fine.
  const schemaVersion = "v1.0.0";
  return NextResponse.json({
    appVersion: packageJson.version,
    schemaVersion,
    runtime: process.env.METALU_RUNTIME === "tauri" ? "tauri" : "web",
  });
}