import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getSuppliers, createSupplier } from "@/modules/suppliers/services/supplierService";
import { SupplierSchema } from "@/modules/suppliers/validations/supplierSchemas";

export async function GET() {
  const data = await getSuppliers();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  // Temporarily allow without auth for testing
  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? "temp-user-id";

  const body = await req.json();
  const parsed = SupplierSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }

  const result = await createSupplier(parsed.data, userId);
  return NextResponse.json(result, { status: 201 });
}
