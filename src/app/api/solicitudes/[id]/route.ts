import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  getSolicitudById,
  updateSolicitud,
  updateSolicitudReview,
  deleteSolicitud,
} from "@/modules/solicitudes/services/solicitudService";
import {
  SolicitudSchema,
  SolicitudReviewSchema,
} from "@/modules/solicitudes/validations/solicitudSchemas";
import { isAdmin } from "@/lib/auth/permissions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const data = await getSolicitudById(id);
    if (!data)
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
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

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  // Determine which schema to use based on which fields are present
  const isReview = "supplierId" in body || "items" in body;
  if (isReview) {
    if (!admin) {
      return NextResponse.json(
        { error: "Solo administradores pueden editar la revisión" },
        { status: 403 }
      );
    }
    const parsed = SolicitudReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join("; ") },
        { status: 400 }
      );
    }
    try {
      const updated = await updateSolicitudReview(id, parsed.data, userId);
      return NextResponse.json(updated);
    } catch (err: any) {
      const msg = err.message ?? "Error al actualizar";
      const status = msg.includes("no encontrado")
        ? 404
        : msg.includes("No tienes permiso")
        ? 403
        : 400;
      return NextResponse.json({ error: msg }, { status });
    }
  } else {
    const parsed = SolicitudSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join("; ") },
        { status: 400 }
      );
    }
    try {
      const updated = await updateSolicitud(id, parsed.data, userId);
      return NextResponse.json(updated);
    } catch (err: any) {
      const msg = err.message ?? "Error al actualizar";
      const status = msg.includes("no encontrada")
        ? 404
        : msg.includes("No tienes permiso")
        ? 403
        : 400;
      return NextResponse.json({ error: msg }, { status });
    }
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    await deleteSolicitud(id, session.user.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const msg = err.message ?? "Error al eliminar";
    if (msg.includes("no encontrada"))
      return NextResponse.json({ error: msg }, { status: 404 });
    if (msg.includes("No se puede eliminar"))
      return NextResponse.json({ error: msg }, { status: 409 });
    if (msg.includes("No tienes permiso"))
      return NextResponse.json({ error: msg }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
