import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { deleteDocument } from "@/modules/suppliers/services/supplierDocumentService";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { docId } = await params;
  await deleteDocument(docId);
  return NextResponse.json({ success: true });
}