/**
 * Generates the LAN installation guide PDF for end users (workshop staff).
 *
 * Output: `guia-instalacion-lan.pdf` in the repo root by default.
 *
 * Run:
 *   npm run pdf:install-guide
 * or:
 *   npx tsx scripts/generate-install-guide.ts [output-path]
 */

import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { InstallGuidePdf } from "../src/lib/pdf/InstallGuidePdf";
import { getLogoDataUri } from "../src/lib/pdf/logo";
import { registerPdfFonts } from "../src/lib/pdf/fonts";

async function main(): Promise<void> {
  registerPdfFonts();
  const logoSrc = getLogoDataUri();

  const outArg = process.argv[2];
  const outputPath = path.resolve(
    outArg ?? path.join(process.cwd(), "guia-instalacion-lan.pdf"),
  );

  console.log(`[install-guide] rendering → ${outputPath}`);
  const buffer = await renderToBuffer(
    createElement(InstallGuidePdf, { logoSrc }),
  );
  fs.writeFileSync(outputPath, buffer);

  const sizeKb = (buffer.byteLength / 1024).toFixed(1);
  console.log(`[install-guide] wrote ${sizeKb} KB to ${outputPath}`);
}

main().catch((err) => {
  console.error("[install-guide] error:", err);
  process.exit(1);
});
