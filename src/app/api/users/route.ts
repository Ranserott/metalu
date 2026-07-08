import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getUsers, createUser } from "@/modules/users/services/userService";
import { CreateUserSchema } from "@/modules/users/validations/userSchemas";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !session.user.roles.includes("Admin")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const users = await getUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !session.user.roles.includes("Admin")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const validated = CreateUserSchema.parse(body);

    const user = await createUser(validated, session.user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    if (error.code === "P2002") {
      return NextResponse.json({ error: "El email ya existe" }, { status: 400 });
    }
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}