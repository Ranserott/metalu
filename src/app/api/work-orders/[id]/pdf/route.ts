import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getWorkOrderById } from "@/modules/work-orders/services/workOrderService";
import { WorkOrderPdf } from "@/modules/work-orders/pdf/WorkOrderPdf";
import { getLogoDataUri } from "@/lib/pdf/logo";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel default for Hobby is 10s. PDF render + Prisma lookups can exceed that,
// so allow up to 60s on Pro.
export const maxDuration = 60;

/**
 * GET /api/work-orders/[id]/pdf
 *
 * Streams a PDF of the given work order. The footer "Usuario" line shows the
 * creator (WorkOrder.createdBy) with name and phone — not all active users.
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
      return NextResponse.json({ error: "Missing work order id" }, { status: 400 });
    }

    const workOrder = await getWorkOrderById(id);

    if (!workOrder) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 });
    }

    // Read the logo once (cached after first success) and pass as a data URI.
    // Returns null if public/logo.svg is missing on the current environment.
    const logoSrc = getLogoDataUri();

    // renderToBuffer consumes the pdfkit stream into a real Node Buffer.
    // Do NOT use `pdf(...).toBuffer()` — despite its name it returns a STREAM,
    // not a Buffer (see the TODO in @react-pdf/renderer source). A stream has
    // no `.byteLength`, so `Content-Length` becomes "undefined" and Vercel's
    // response layer rejects it with a 500.
    const buffer = await renderToBuffer(
      createElement(WorkOrderPdf, {
        workOrder,
        logoSrc,
      }) as Parameters<typeof renderToBuffer>[0]
    );

    const filename = `Trabajo-${workOrder.number}.pdf`;

    // Node Buffer is a valid BodyInit. Do NOT re-wrap it in `new Uint8Array(...)`
    // — depending on the buffer's underlying ArrayBuffer offset, that
    // constructor can silently produce a 0-length Uint8Array, which is why the
    // browser was getting a 0-byte download.
    console.log(
      `[pdf] workOrder=${workOrder.number} buffer.length=${buffer.length} ` +
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
    console.error("[GET /api/work-orders/:id/pdf] error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
