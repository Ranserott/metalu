import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { changePassword } from "@/modules/users/services/userService";
import { ChangePasswordAdminSchema } from "@/modules/users/validations/userSchemas";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!session.user.roles.includes("Admin")) {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = ChangePasswordAdminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    await changePassword(id, parsed.data.newPassword);
    return NextResponse.json({ success: true, message: "Password actualizado" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
