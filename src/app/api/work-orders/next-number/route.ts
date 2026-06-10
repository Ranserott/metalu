import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { generateWorkOrderNumber } from "@/modules/work-orders/services/workOrderService";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const number = await generateWorkOrderNumber();
  return NextResponse.json({ number });
}
