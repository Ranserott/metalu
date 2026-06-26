/**
 * Registers EB Garamond font files for use with @react-pdf/renderer.
 *
 * Sources are LOCAL files installed via `@fontsource/eb-garamond`. This avoids
 * fetching from `fonts.gstatic.com` (which can rotate URLs) and guarantees the
 * font is always available for server-side PDF generation.
 *
 * Use this from any PDF document component:
 *
 *   import { registerPdfFonts } from "@/lib/pdf/fonts";
 *   registerPdfFonts();
 *   // ...then use style={{ fontFamily: "EBGaramond" }} on <Text>
 *
 * `registerPdfFonts` is idempotent — safe to call multiple times.
 */
import { join } from "path";
import { Font } from "@react-pdf/renderer";

const FAMILY = "EBGaramond";

/**
 * @react-pdf/renderer runs server-side in plain Node and does NOT understand
 * webpack module aliases (`@fontsource/...`) or Next.js public paths. We resolve
 * to absolute filesystem paths via process.cwd().
 */
const FONT_DIR = join(
  process.cwd(),
  "node_modules",
  "@fontsource",
  "eb-garamond",
  "files"
);

export function registerPdfFonts(): void {
  // Idempotency guard: @react-pdf/renderer's Font.register throws if the same
  // family is registered twice. Cache the registration so multiple PDFs in the
  // same Node process don't blow up.
  const g = globalThis as unknown as { __pdfFontsRegistered?: boolean };
  if (g.__pdfFontsRegistered) return;

  Font.register({
    family: FAMILY,
    fonts: [
      {
        src: join(FONT_DIR, "eb-garamond-latin-400-normal.woff2"),
        fontWeight: 400,
      },
      {
        src: join(FONT_DIR, "eb-garamond-latin-700-normal.woff2"),
        fontWeight: 700,
      },
      {
        src: join(FONT_DIR, "eb-garamond-latin-400-italic.woff2"),
        fontWeight: 400,
        fontStyle: "italic",
      },
      {
        src: join(FONT_DIR, "eb-garamond-latin-700-italic.woff2"),
        fontWeight: 700,
        fontStyle: "italic",
      },
    ],
  });

  g.__pdfFontsRegistered = true;
}

export const PDF_FONT_FAMILY = FAMILY;