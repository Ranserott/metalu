import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { ClientSchema } from "@/modules/clients/validations/clientSchemas";
import { getClientById, updateClient } from "@/modules/clients/services/clientService";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const client = await getClientById(id);
    if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(client);
  } catch (error) {
    console.error("[API /clients/[id] GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = ClientSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const updated = await updateClient(id, parsed.data);
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }
    console.error("[API /clients/[id] PATCH]", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
