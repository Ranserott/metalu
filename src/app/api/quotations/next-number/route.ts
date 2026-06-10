import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { generateQuotationNumber } from "@/modules/quotations/services/quotationService";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const number = await generateQuotationNumber();
  return NextResponse.json({ number });
}
