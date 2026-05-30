import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getClients, createClient } from "@/modules/clients/services/clientService";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getClients();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { code, name, contact, email, phone, address, city, notes, isActive } = body;

  try {
    const result = await createClient({ code, name, contact, email, phone, address, city, notes, isActive }, session.user.id);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}