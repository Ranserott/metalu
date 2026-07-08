import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { ReportFiltersSchema } from "@/modules/reports/validations/reportSchemas";
import {
  getCartola,
  getPendingInvoices,
  getSales,
  getPayments,
  getCreditNotes,
  getBalances,
} from "@/modules/reports/services/reportService";

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
  const fromDate = from ? new Date(from) : undefined;
  const toDate = to ? new Date(to) : undefined;

  try {
    if (type === "cartola") {
      if (!clientId) {
        return NextResponse.json(
          { error: "clientId is required for cartola" },
          { status: 400 }
        );
      }
      const result = await getCartola({ clientId, from: fromDate, to: toDate });
      return NextResponse.json(result);
    }

    if (type === "pending-invoices") {
      const result = await getPendingInvoices({ clientId, from: fromDate, to: toDate });
      return NextResponse.json(result);
    }

    if (type === "sales") {
      const result = await getSales({ clientId, from: fromDate, to: toDate });
      return NextResponse.json(result);
    }

    if (type === "payments") {
      const result = await getPayments({ clientId, from: fromDate, to: toDate });
      return NextResponse.json(result);
    }

    if (type === "credit-notes") {
      const result = await getCreditNotes({ clientId, from: fromDate, to: toDate });
      return NextResponse.json(result);
    }

    if (type === "balances") {
      const result = await getBalances({ clientId });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
  } catch (error: any) {
    console.error("[GET /api/reports] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}