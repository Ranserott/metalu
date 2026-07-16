// src/app/api/suppliers/reports/pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createElement } from "react";
import { auth } from "@/lib/auth/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma/prisma";
import { supplierReportFiltersSchema } from "@/modules/suppliers-reports/validations/reportSchemas";
import {
  getDocumentsByDueDate,
  getDocumentsBySupplier,
  getDailySummary,
} from "@/modules/suppliers-reports/services/supplierReportService";
import { SupplierReportsPdf } from "@/modules/suppliers-reports/pdf/SupplierReportsPdf";
import { supplierReportFilename } from "@/modules/suppliers-reports/utils/filename";
import type { SupplierReportType } from "@/modules/suppliers-reports/types/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel default for Hobby is 10s. PDF render + Prisma lookups can exceed that,
// so allow up to 60s on Pro.
export const maxDuration = 60;

const VALID_TYPES: SupplierReportType[] = [
  "by-due-date",
  "by-supplier",
  "daily-summary",
];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const raw = {
    type: searchParams.get("type") ?? undefined,
    supplierId: searchParams.get("supplierId") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  };

  const parsed = supplierReportFiltersSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const { type, supplierId, from, to } = parsed.data;
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: "Tipo de reporte inválido" },
      { status: 400 }
    );
  }

  let supplierName: string | null = null;
  if (supplierId) {
    const s = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { name: true },
    });
    supplierName = s?.name ?? null;
  }

  try {
    const filters = {
      supplierId,
      from,
      to,
    };

    // Each service returns its own strongly-typed `totals` (e.g. daily-summary
    // nests EstadoBreakdown objects), so we widen at this boundary just like the
    // /api/reports runReport dispatcher does — the PDF component accepts a
    // loosely-typed `totals` and narrows per-section internally.
    let result: { rows: unknown[]; totals?: Record<string, unknown> };
    switch (type) {
      case "by-due-date":
        result = await getDocumentsByDueDate(filters);
        break;
      case "by-supplier":
        result = await getDocumentsBySupplier(filters);
        break;
      case "daily-summary":
        result = await getDailySummary(filters);
        break;
    }

    console.log(
      `[pdf/suppliers/reports] type=${type} supplierId=${supplierId ?? "—"} rows=${result.rows.length}`
    );

    // renderToBuffer consumes the pdfkit stream into a real Node Buffer.
    // Do NOT use `pdf(...).toBuffer()` — despite its name it returns a STREAM,
    // not a Buffer (see the TODO in @react-pdf/renderer source). A stream has
    // no `.byteLength`, so `Content-Length` becomes "undefined" and Vercel's
    // response layer rejects it with a 500.
    const buffer = await renderToBuffer(
      createElement(SupplierReportsPdf, {
        type,
        filters: {
          supplierId,
          from: from ? from.toISOString() : undefined,
          to: to ? to.toISOString() : undefined,
        },
        rows: result.rows,
        totals: result.totals as Record<string, number> | undefined,
        supplierName,
      }) as Parameters<typeof renderToBuffer>[0]
    );

    const filename = supplierReportFilename(type);

    // Node Buffer is a valid BodyInit. Do NOT re-wrap it in `new Uint8Array(...)`
    // — depending on the buffer's underlying ArrayBuffer offset, that
    // constructor can silently produce a 0-length Uint8Array, which is why the
    // browser was getting a 0-byte download.
    console.log(
      `[pdf/suppliers/reports] type=${type} supplierId=${supplierId ?? "—"} rows=${result.rows.length} ` +
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
    console.error("[pdf/suppliers/reports] error:", error);
    return NextResponse.json(
      { error: "Error al generar el PDF" },
      { status: 500 }
    );
  }
}
