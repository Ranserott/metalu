import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { createInvoice } from "@/modules/billing/services/invoiceService";
import { InvoiceSchema } from "@/modules/billing/validations/invoiceSchemas";

/**
 * POST /api/invoices
 *
 * Creates a new invoice from the InvoiceForm payload.
 * - Normalizes dates: JSON sends ISO strings, schema expects Date.
 * - Defaults `series` to "A" when the form doesn't send it (the form
 *   picks the document type via `tipoDocumento`).
 * - Defaults `type` and `status` are already set by the schema.
 *
 * Auth: any authenticated user.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const normalized = {
    ...body,
    series: (body.series as string) ?? "A",
    issueDate: body.issueDate ? new Date(body.issueDate as string) : undefined,
    dueDate: body.dueDate ? new Date(body.dueDate as string) : undefined,
  };

  const parsed = InvoiceSchema.safeParse(normalized);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  try {
    const created = await createInvoice(parsed.data, session.user.id);
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/invoices]", err);
    return NextResponse.json(
      { error: err.message ?? "Error al crear la factura" },
      { status: 500 }
    );
  }
}