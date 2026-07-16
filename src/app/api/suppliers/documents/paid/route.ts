import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/permissions";
import { markPaidSchema } from "@/modules/suppliers/validations/markPaidSchema";
import { markDocumentsAsPaid } from "@/modules/suppliers/services/supplierDocumentService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin-only — /suppliers/reports is admin-only and the bulk mutation is
  // write-class. Supervisor is already blocked at the middleware level for
  // /suppliers, but the route also explicitly checks role to defend against
  // direct API calls from any user with a session.
  if (!isAdmin(session.user.roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = markPaidSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      { error: firstIssue?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    const { updated } = await markDocumentsAsPaid(parsed.data.ids);
    return NextResponse.json({ updated }, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/suppliers/documents/paid] error:", error);
    return NextResponse.json(
      { error: "Error al marcar como pagados" },
      { status: 500 }
    );
  }
}
