import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getQuotationById } from "@/modules/quotations/services/quotationService";
import { QuotationPdf } from "@/modules/quotations/pdf/QuotationPdf";
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const buffer = await pdf(
      createElement(QuotationPdf, { quotation }) as Parameters<typeof pdf>[0]
    ).toBuffer();

    const filename = `Cotizacion-${quotation.number}.pdf`;
    const bodyBytes = new Uint8Array(buffer as unknown as Uint8Array);

    return new NextResponse(bodyBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(bodyBytes.byteLength),
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