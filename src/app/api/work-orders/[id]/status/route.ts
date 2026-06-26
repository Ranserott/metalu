import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { updateWorkOrderStatus } from "@/modules/work-orders/services/workOrderService";
import { WorkOrderStatus } from "@/generated/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES = Object.values(WorkOrderStatus) as string[];

/**
 * PATCH /api/work-orders/[id]/status
 *
 * Body: { status: WorkOrderStatus }
 *
 * Updates only the `status` field of the work order. Does NOT touch
 * materials, totals, or any other field — safe for inline table updates.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing work order id" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const status = body?.status;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const updated = await updateWorkOrderStatus(id, status);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("[PATCH /api/work-orders/:id/status] error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}