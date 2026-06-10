import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getRoles } from "@/modules/roles/services/roleService";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getRoles();
  return NextResponse.json(data);
}
