import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getWorkOrderById, updateWorkOrder, deleteWorkOrder, WorkOrderConflictError } from "@/modules/work-orders/services/workOrderService";
import { WorkOrderSchema } from "@/modules/work-orders/validations/workOrderSchemas";
import { canMutateRecord } from "@/lib/auth/recordPermissions";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const workOrder = await getWorkOrderById(id);
  if (!workOrder) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(workOrder);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const current = await getWorkOrderById(id);
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const gate = await canMutateRecord(current.status);
  if (!gate.allowed) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await req.json();
  const { items, ...workOrderData } = body;
  const parsed = WorkOrderSchema.partial().safeParse(workOrderData);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await updateWorkOrder(id, parsed.data, items || []);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof WorkOrderConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const current = await getWorkOrderById(id);
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const gate = await canMutateRecord(current.status);
  if (!gate.allowed) return NextResponse.json({ error: gate.error }, { status: gate.status });

  await deleteWorkOrder(id);
  return NextResponse.json({ success: true });
}