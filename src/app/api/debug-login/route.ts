import { prisma } from "@/lib/prisma/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const username = String(body.username ?? "admin");
  const password = String(body.password ?? "admin123");

  const user = await prisma.user.findFirst({
    where: { name: username, deletedAt: null },
    select: { id: true, name: true, email: true, isActive: true, password: true, deletedAt: true },
  });

  if (!user) {
    return Response.json({ ok: false, step: "find", error: "user_not_found" });
  }
  if (!user.isActive) {
    return Response.json({ ok: false, step: "find", error: "user_inactive" });
  }

  const valid = await bcrypt.compare(password, user.password);
  return Response.json({
    ok: valid,
    step: "compare",
    user: { id: user.id, name: user.name, email: user.email, isActive: user.isActive },
    passwordLength: user.password.length,
    passwordPrefix: user.password.slice(0, 7),
  });
}
