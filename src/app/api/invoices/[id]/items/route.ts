import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma/prisma";
import { InvoiceItemSchema } from "@/modules/billing/validations/invoiceSchemas";

/**
 * POST /api/invoices/[id]/items
 *
 * Replaces ALL line items for an invoice with a new array.
 * Uses a Prisma transaction to atomically delete existing items and
 * create the new ones, so the invoice is never observed with partial
 * items in the DB.
 *
 * Auth: any authenticated user.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: { items?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!Array.isArray(body.items)) {
    return NextResponse.json(
      { error: "items debe ser un array" },
      { status: 400 }
    );
  }

  const parsed = z.array(InvoiceItemSchema).safeParse(body.items);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!invoice) {
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });

      if (parsed.data.length > 0) {
        await tx.invoiceItem.createMany({
          data: parsed.data.map((item) => ({
            invoiceId: id,
            description: item.description,
            quantity: item.quantity as any,
            unitPrice: item.unitPrice as any,
            total: item.total as any,
          })),
        });
      }

      return tx.invoice.findUnique({
        where: { id },
        include: { items: true },
      });
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[POST /api/invoices/[id]/items]", err);
    return NextResponse.json(
      { error: err.message ?? "Error al actualizar items" },
      { status: 500 }
    );
  }
}
