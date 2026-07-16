// src/app/api/reports/pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createElement } from "react";
import { auth } from "@/lib/auth/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma/prisma";
import { ReportFiltersSchema } from "@/modules/reports/validations/reportSchemas";
import { runReport } from "@/modules/reports/services/reportService";
import ReportsPdf from "@/modules/reports/pdf/ReportsPdf";
import { reportFilename } from "@/modules/reports/utils/filename";
import type { ReportType } from "@/modules/reports/types/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel default for Hobby is 10s. PDF render + Prisma lookups can exceed that,
// so allow up to 60s on Pro.
export const maxDuration = 60;

const VALID_TYPES: ReportType[] = [
  "cartola",
  "pending-invoices",
  "sales",
  "payments",
  "credit-notes",
  "balances",
];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const raw = {
    type: searchParams.get("type") ?? undefined,
    clientId: searchParams.get("clientId") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  };

  const parsed = ReportFiltersSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const { type, clientId, from, to } = parsed.data;
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: "Tipo de reporte inválido" },
      { status: 400 }
    );
  }

  let clientName: string | null = null;
  if (clientId) {
    const c = await prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true },
    });
    clientName = c?.name ?? null;
  }

  try {
    const { rows, totals } = await runReport(type, { clientId, from, to });
    console.log(
      `[pdf/reports] type=${type} clientId=${clientId ?? "—"} rows=${rows.length}`
    );

    // renderToBuffer consumes the pdfkit stream into a real Node Buffer.
    // Do NOT use `pdf(...).toBuffer()` — despite its name it returns a STREAM,
    // not a Buffer (see the TODO in @react-pdf/renderer source). A stream has
    // no `.byteLength`, so `Content-Length` becomes "undefined" and Vercel's
    // response layer rejects it with a 500.
    const buffer = await renderToBuffer(
      createElement(ReportsPdf, {
        type,
        filters: { clientId, from, to },
        rows,
        totals,
        clientName,
      }) as Parameters<typeof renderToBuffer>[0]
    );

    const filename = reportFilename(type);

    // Node Buffer is a valid BodyInit. Do NOT re-wrap it in `new Uint8Array(...)`
    // — depending on the buffer's underlying ArrayBuffer offset, that
    // constructor can silently produce a 0-length Uint8Array, which is why the
    // browser was getting a 0-byte download.
    console.log(
      `[pdf/reports] type=${type} clientId=${clientId ?? "—"} rows=${rows.length} ` +
      `buffer.length=${buffer.length} byteOffset=${buffer.byteOffset} byteLength=${buffer.byteLength}`
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
    if (/requiere|inválido/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[GET /api/reports/pdf] error:", error);
    return NextResponse.json(
      { error: "Error al generar el PDF" },
      { status: 500 }
    );
  }
}