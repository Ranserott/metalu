/**
 * Resolves the company logo as a base64 data URI (or null if the file is
 * unreachable).
 *
 * Why data URIs instead of filesystem paths:
 *   - On Vercel serverless, `process.cwd() + "/public/logo.svg"` resolves to
 *     `/var/task/public/logo.svg`. Whether that file is present depends on
 *     Vercel's bundler. To be safe across environments, we read the file at
 *     request time (cached after first success) and pass the bytes as a data
 *     URI to @react-pdf/renderer, which does NOT need a filesystem path.
 *
 * Reads are wrapped in try/catch so a missing file logs and returns null
 * instead of crashing the route handler.
 */
import { readFileSync } from "fs";
import { join } from "path";

const LOGO_ABS_PATH = join(process.cwd(), "public", "logo.svg");

let cached: string | null | undefined; // undefined = not loaded yet

export function getLogoDataUri(): string | null {
  if (cached !== undefined) return cached;
  try {
    const buf = readFileSync(LOGO_ABS_PATH);
    cached = `data:image/svg+xml;base64,${buf.toString("base64")}`;
    return cached;
  } catch (err) {
    console.warn(
      `[pdf logo] could not read ${LOGO_ABS_PATH}: ${(err as Error).message}`
    );
    cached = null;
    return null;
  }
}
