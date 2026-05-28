import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getSupplierDocuments, createSupplierDocument, generateDocumentNumber } from "@/modules/payments/services/paymentService";
import { SupplierDocumentSchema } from "@/modules/payments/validations/paymentSchemas";

export async function GET() {
  const data = await getSupplierDocuments();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = SupplierDocumentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }

  const number = await generateDocumentNumber();
  const result = await createSupplierDocument({ ...parsed.data, number }, session.user.id);

  return NextResponse.json(result, { status: 201 });
}
