import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getQuotationById, updateQuotation, deleteQuotation } from "@/modules/quotations/services/quotationService";
import { QuotationSchema } from "@/modules/quotations/validations/quotationSchemas";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const quotation = await getQuotationById(id);
  if (!quotation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(quotation);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { items, ...quotationData } = body;
  const parsed = QuotationSchema.partial().safeParse(quotationData);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await updateQuotation(id, parsed.data, items || []);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await deleteQuotation(id);
  return NextResponse.json({ success: true });
}
