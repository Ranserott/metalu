import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getRoles } from "@/modules/roles/services/roleService";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const roles = await getRoles();
    return NextResponse.json({ roles });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
