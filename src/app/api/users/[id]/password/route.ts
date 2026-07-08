import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { changePassword } from "@/modules/users/services/userService";
import { ChangePasswordAdminSchema } from "@/modules/users/validations/userSchemas";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.roles.includes("Admin")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = ChangePasswordAdminSchema.parse(body);

    await changePassword(id, validated.newPassword);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error changing password:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}