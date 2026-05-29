import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { changeOwnPassword } from "@/modules/users/services/userService";
import { ChangePasswordSchema } from "@/modules/users/validations/userSchemas";

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validated = ChangePasswordSchema.parse(body);

    await changeOwnPassword(session.user.id, validated.currentPassword!, validated.newPassword);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    if (error.message === "Contraseña actual incorrecta") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error changing own password:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}