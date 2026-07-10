import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma/prisma";
import { getWorkOrderById } from "@/modules/work-orders/services/workOrderService";
import { WorkOrderPdf } from "@/modules/work-orders/pdf/WorkOrderPdf";
import { getLogoDataUri } from "@/lib/pdf/logo";
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel default for Hobby is 10s. PDF render + Prisma lookups can exceed that,
// so allow up to 60s on Pro.
export const maxDuration = 60;

/**
 * GET /api/work-orders/[id]/pdf
 *
 * Streams a PDF of the given work order. The "usuarios" footer section lists
 * all active users (names only — User model has no phone field).
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

    const [workOrder, users] = await Promise.all([
      getWorkOrderById(id),
      prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    if (!workOrder) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 });
    }

    // Read the logo once (cached after first success) and pass as a data URI.
    // Returns null if public/logo.svg is missing on the current environment.
    const logoSrc = getLogoDataUri();

    const buffer = await pdf(
      createElement(WorkOrderPdf, {
        workOrder,
        users,
        logoSrc,
      }) as Parameters<typeof pdf>[0]
    ).toBuffer();

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
