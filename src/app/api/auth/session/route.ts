import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({ user: session.user });
}
