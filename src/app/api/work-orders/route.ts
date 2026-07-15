import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getWorkOrders, createWorkOrder, WorkOrderConflictError } from "@/modules/work-orders/services/workOrderService";
import { WorkOrderSchema } from "@/modules/work-orders/validations/workOrderSchemas";
import { prepareWorkOrderCreate } from "@/lib/auth/recordPermissions";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getWorkOrders();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const prep = await prepareWorkOrderCreate(body);
  if (!prep.ok) return NextResponse.json({ error: prep.error }, { status: prep.status });

  const { items, ...workOrderData } = prep.data;
  console.log("[POST /api/work-orders] body:", workOrderData);

  const parsed = WorkOrderSchema.safeParse(workOrderData);
  if (!parsed.success) {
    console.error("[POST /api/work-orders] validation error:", parsed.error.issues);
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await createWorkOrder(parsed.data, prep.userId, items || []);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error instanceof WorkOrderConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[POST /api/work-orders] create error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}