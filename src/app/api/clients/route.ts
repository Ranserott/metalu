import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getClients, createClient } from "@/modules/clients/services/clientService";
import { ClientSchema } from "@/modules/clients/validations/clientSchemas";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const activeOnly = req.nextUrl.searchParams.get("activeOnly") === "true";
    const data = await getClients({ activeOnly });
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API /clients GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = ClientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const result = await createClient(parsed.data, session.user.id);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}