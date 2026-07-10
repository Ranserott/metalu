import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getQuotationById } from "@/modules/quotations/services/quotationService";
import { QuotationPdf } from "@/modules/quotations/pdf/QuotationPdf";
import { getLogoDataUri } from "@/lib/pdf/logo";
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel default for Hobby is 10s. PDF render + Prisma lookups can exceed that,
// so allow up to 60s on Pro.
export const maxDuration = 60;

/**
 * GET /api/quotations/[id]/pdf
 *
 * Streams a PDF of the given quotation. All data is read directly from the
 * quotation record — no print-time inputs are required.
 *
 * Auth: any authenticated user.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing quotation id" }, { status: 400 });
    }

    const quotation = await getQuotationById(id);
    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    // Read the logo once (cached after first success) and pass as a data URI.
    // Returns null if public/logo.svg is missing on the current environment.
    const logoSrc = getLogoDataUri();

    const buffer = await pdf(
      createElement(QuotationPdf, { quotation, logoSrc }) as Parameters<typeof pdf>[0]
    ).toBuffer();

    const filename = `Cotizacion-${quotation.number}.pdf`;

    // Node Buffer is a valid BodyInit. Do NOT re-wrap it in `new Uint8Array(...)`
    // — depending on the buffer's underlying ArrayBuffer offset, that
    // constructor can silently produce a 0-length Uint8Array, which is why the
    // browser was getting a 0-byte download.
    console.log(
      `[pdf] quotation=${quotation.number} buffer.length=${buffer.length} ` +
      `byteOffset=${buffer.byteOffset} byteLength=${buffer.byteLength} ` +
      `logo=${logoSrc ? "yes" : "no"}`
    );

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("[GET /api/quotations/:id/pdf] error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}