import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getWorkOrders, createWorkOrder } from "@/modules/work-orders/services/workOrderService";
import { WorkOrderSchema } from "@/modules/work-orders/validations/workOrderSchemas";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getWorkOrders();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  console.log("[POST /api/work-orders] body:", body);
  const { items, ...workOrderData } = body;
  const parsed = WorkOrderSchema.safeParse(workOrderData);
  if (!parsed.success) {
    console.error("[POST /api/work-orders] validation error:", parsed.error.issues);
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await createWorkOrder(parsed.data, session.user.id, items || []);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/work-orders] create error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
