import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  getSolicitudes,
  createSolicitud,
} from "@/modules/solicitudes/services/solicitudService";
import { SolicitudSchema } from "@/modules/solicitudes/validations/solicitudSchemas";
import { SolicitudStatus } from "@/modules/solicitudes/types/solicitud";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as SolicitudStatus | null;
  const workOrderId = searchParams.get("workOrderId");

  try {
    const data = await getSolicitudes({
      ...(status ? { status } : {}),
      ...(workOrderId ? { workOrderId } : {}),
    });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = SolicitudSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  try {
    const created = await createSolicitud(parsed.data, session.user.id);
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    const msg = err.message ?? "Error al crear la solicitud";
    if (msg.includes("no encontrado")) {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
