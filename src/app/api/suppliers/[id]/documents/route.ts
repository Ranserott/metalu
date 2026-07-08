import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  getDocumentsBySupplier,
  createDocument,
} from "@/modules/suppliers/services/supplierDocumentService";
import { SupplierDocumentSchema } from "@/modules/suppliers/validations/supplierDocumentSchemas";
import { getSupplierById } from "@/modules/suppliers/services/supplierService";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supplier = await getSupplierById(id);
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

  const documents = await getDocumentsBySupplier(id);
  return NextResponse.json(documents);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supplier = await getSupplierById(id);
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

  const body = await req.json();
  const parsed = SupplierDocumentSchema.safeParse({
    ...body,
    valor: typeof body.valor === "string" ? parseFloat(body.valor) : body.valor,
    fechaDocumento: body.fechaDocumento ? new Date(body.fechaDocumento) : undefined,
    fechaVencimiento: body.fechaVencimiento ? new Date(body.fechaVencimiento) : undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const document = await createDocument(id, parsed.data, session.user.id);
    return NextResponse.json(document, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}