import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  getEncargados,
  createEncargado,
} from "@/modules/encargados/services/encargadoService";
import { EncargadoSchema } from "@/modules/encargados/validations/encargadoSchemas";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = req.nextUrl.searchParams.get("clientId") || undefined;
    const data = await getEncargados({ clientId });
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API /encargados GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = EncargadoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    try {
      const result = await createEncargado(parsed.data, session.user.id);
      return NextResponse.json(result, { status: 201 });
    } catch (serviceError: any) {
      const message = serviceError.message || "Error interno";
      const status = message.includes("Ya existe") ? 409 : 500;
      return NextResponse.json({ error: message }, { status });
    }
  } catch (error) {
    console.error("[API /encargados POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
