import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { supplierReportFiltersSchema } from "@/modules/suppliers-reports/validations/reportSchemas";
import {
  getDocumentsByDueDate,
  getDocumentsBySupplier,
  getDailySummary,
} from "@/modules/suppliers-reports/services/supplierReportService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
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

  const { type, ...filters } = parsed.data;

  try {
    if (type === "by-due-date") {
      const result = await getDocumentsByDueDate(filters);
      return NextResponse.json(result);
    }
    if (type === "by-supplier") {
      const result = await getDocumentsBySupplier(filters);
      return NextResponse.json(result);
    }
    // type === "daily-summary"
    const result = await getDailySummary(filters);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[suppliers-reports] error generating report", err);
    return NextResponse.json(
      { error: "Error al generar reporte" },
      { status: 500 }
    );
  }
}