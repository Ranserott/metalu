import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { canAccess } from "@/lib/auth/permissions";
import { getUsers, createUser } from "@/modules/users/services/userService";
import { UserSchema } from "@/modules/users/validations/userSchemas";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getUsers();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  if (!canAccess(session.user.roles[0], "users", "create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = UserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await createUser(parsed.data, session.user.id);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Email ya existe" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
