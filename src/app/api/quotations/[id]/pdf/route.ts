import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getQuotationById } from "@/modules/quotations/services/quotationService";
import { QuotationPdf, type PrintFields } from "@/modules/quotations/pdf/QuotationPdf";
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = Partial<PrintFields>;

function normalizePrintFields(body: Body | null | undefined): PrintFields {
  const b = body ?? {};
  return {
    descripcionTrabajo: typeof b.descripcionTrabajo === "string" ? b.descripcionTrabajo : "",
    plazoEntrega: typeof b.plazoEntrega === "string" ? b.plazoEntrega : "",
    atencion: typeof b.atencion === "string" ? b.atencion : "",
    area: typeof b.area === "string" ? b.area : "",
    cotizoNombre: typeof b.cotizoNombre === "string" ? b.cotizoNombre : "",
  };
}

export async function POST(
  req: NextRequest,
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

    let body: Body = {};
    try {
      body = (await req.json()) as Body;
    } catch {
      // Body is optional — empty defaults are fine.
      body = {};
    }
    const printFields = normalizePrintFields(body);

    const quotation = await getQuotationById(id);
    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    const buffer = await pdf(
      createElement(QuotationPdf, { quotation, printFields }) as Parameters<typeof pdf>[0]
    ).toBuffer();

    const filename = `Cotizacion-${quotation.number}.pdf`;
    // NextResponse accepts a Uint8Array body; pdf().toBuffer() returns Buffer in Node.
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
    console.error("[POST /api/quotations/:id/pdf] error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}