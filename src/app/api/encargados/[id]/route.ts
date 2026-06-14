import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  getEncargadoById,
  updateEncargado,
  deleteEncargado,
} from "@/modules/encargados/services/encargadoService";
import { EncargadoSchema } from "@/modules/encargados/validations/encargadoSchemas";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const encargado = await getEncargadoById(id);
    if (!encargado) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(encargado);
  } catch (error) {
    console.error("[API /encargados/[id] GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = EncargadoSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    try {
      const updated = await updateEncargado(id, parsed.data);
      return NextResponse.json(updated);
    } catch (serviceError: any) {
      const message = serviceError.message || "Error interno";
      const status = message.includes("Ya existe")
        ? 409
        : message.includes("inválido")
        ? 400
        : 500;
      return NextResponse.json({ error: message }, { status });
    }
  } catch (error) {
    console.error("[API /encargados/[id] PATCH]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    try {
      await deleteEncargado(id);
      return NextResponse.json({ success: true });
    } catch (serviceError: any) {
      const message = serviceError.message || "Error interno";
      const status = message.includes("trabajo") ? 409 : 500;
      return NextResponse.json({ error: message }, { status });
    }
  } catch (error) {
    console.error("[API /encargados/[id] DELETE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
