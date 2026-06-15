import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { transitionSolicitud } from "@/modules/solicitudes/services/solicitudService";
import { SolicitudTransitionSchema } from "@/modules/solicitudes/validations/solicitudSchemas";
import { isAdmin } from "@/lib/auth/permissions";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;
  const admin = isAdmin(session.user.roles);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = SolicitudTransitionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  try {
    const updated = await transitionSolicitud(
      id,
      parsed.data.action,
      userId,
      admin,
      parsed.data.reason
    );
    return NextResponse.json(updated);
  } catch (err: any) {
    const msg = err.message ?? "Error en la transición";
    let status = 500;
    if (msg.includes("no encontrada") || msg.includes("No encontrado"))
      status = 404;
    else if (
      msg.includes("Solo administradores") ||
      msg.includes("No tienes permiso")
    )
      status = 403;
    else if (msg.includes("Transición no permitida")) status = 400;
    else if (msg.includes("Falta seleccionar")) status = 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
