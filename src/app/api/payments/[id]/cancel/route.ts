import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { cancelSupplierDocument } from "@/modules/payments/services/paymentService";
import { CancelDocumentSchema } from "@/modules/payments/validations/paymentSchemas";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = CancelDocumentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }

  const result = await cancelSupplierDocument(id, parsed.data.cancellationReason);
  return NextResponse.json(result);
}
