/**
 * Registers EB Garamond font files for use with @react-pdf/renderer.
 *
 * Sources are LOCAL files installed via `@fontsource/eb-garamond`. We read
 * each woff file synchronously via `fs.readFileSync`, base64-encode it, and
 * register via a `data:font/woff;base64,...` URI — NOT a filesystem path.
 *
 * Why data URIs instead of paths:
 *   - On Vercel serverless, `process.cwd()/node_modules/@fontsource/.../*.woff`
 *     paths often throw ENOENT because Vercel only bundles files that are
 *     reachable from `import` statements. Files referenced only as string
 *     arguments are tree-shaken out.
 *   - Each read is wrapped in try/catch: if a file is missing (e.g., a variant
 *     isn't installed), that variant is silently skipped and other variants
 *     still register. The PDF will fall back to @react-pdf/renderer's default
 *     Helvetica for any weight/style that failed to register.
 *
 * Use this from any PDF document component:
 *
 *   import { registerPdfFonts } from "@/lib/pdf/fonts";
 *   registerPdfFonts();
 *   // ...then use style={{ fontFamily: "EBGaramond" }} on <Text>
 *
 * `registerPdfFonts` is idempotent — safe to call multiple times.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { Font } from "@react-pdf/renderer";

const FAMILY = "EBGaramond";

// Resolved once at module load. On Vercel this path typically does NOT exist
// at request time (the woff files are pruned by the bundler), but we attempt
// the read inside registerPdfFonts() where we can catch the failure.
const FONT_DIR = join(
  process.cwd(),
  "node_modules",
  "@fontsource",
  "eb-garamond",
  "files"
);

type FontVariant = {
  filename: string;
  fontWeight: 400 | 700;
  fontStyle?: "italic";
};

const VARIANTS: FontVariant[] = [
  { filename: "eb-garamond-latin-400-normal.woff", fontWeight: 400 },
  { filename: "eb-garamond-latin-700-normal.woff", fontWeight: 700 },
  { filename: "eb-garamond-latin-400-italic.woff", fontWeight: 400, fontStyle: "italic" },
  { filename: "eb-garamond-latin-700-italic.woff", fontWeight: 700, fontStyle: "italic" },
];

export function registerPdfFonts(): void {
  // Idempotency guard: @react-pdf/renderer's Font.register rejects duplicate
  // family registrations.
  const g = globalThis as unknown as { __pdfFontsRegistered?: boolean };
  if (g.__pdfFontsRegistered) return;

  const registered: Array<{
    src: string;
    fontWeight: number;
    fontStyle?: "italic";
  }> = [];
  const failed: string[] = [];

  for (const v of VARIANTS) {
    const absPath = join(FONT_DIR, v.filename);
    try {
      const buf = readFileSync(absPath);
      const dataUri = `data:font/woff;base64,${buf.toString("base64")}`;
      registered.push({
        src: dataUri,
        fontWeight: v.fontWeight,
        fontStyle: v.fontStyle,
      });
    } catch (err) {
      // Don't throw — the route's catch block catches a different error
      // class. Silently skip this variant; @react-pdf/renderer will fall back
      // to its built-in font for the missing weight/style.
      failed.push(
        `${v.filename} (${v.fontWeight}${v.fontStyle === "italic" ? "i" : ""})`
      );
    }
  }

  if (registered.length > 0) {
    Font.register({ family: FAMILY, fonts: registered });
  }

  if (failed.length > 0) {
    // Surface to Vercel logs (and local console) so we can tell whether the
    // file-system read is the actual failure mode or something else.
    console.warn(
      `[pdf fonts] skipped ${failed.length}/${VARIANTS.length} variants: ${failed.join(", ")}`
    );
  }

  g.__pdfFontsRegistered = true;
}

export const PDF_FONT_FAMILY = FAMILY;
