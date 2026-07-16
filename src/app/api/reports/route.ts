import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { ReportFiltersSchema } from "@/modules/reports/validations/reportSchemas";
import { runReport } from "@/modules/reports/services/reportService";

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
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { type, clientId, from, to } = parsed.data;

  try {
    const result = await runReport(type, { clientId, from, to });
    return NextResponse.json(result);
  } catch (error: any) {
    if (/requiere|inválido/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[GET /api/reports] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
