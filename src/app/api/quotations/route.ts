import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getQuotations, createQuotation } from "@/modules/quotations/services/quotationService";
import { QuotationSchema } from "@/modules/quotations/validations/quotationSchemas";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getQuotations();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  console.log("[POST /api/quotations] body:", body);
  const { items, ...quotationData } = body;
  const parsed = QuotationSchema.safeParse(quotationData);
  if (!parsed.success) {
    console.error("[POST /api/quotations] validation error:", parsed.error.issues);
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await createQuotation(parsed.data, session.user.id, items || []);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/quotations] create error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
