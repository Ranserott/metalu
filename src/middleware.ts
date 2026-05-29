import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";

export default async function middleware(request: Request) {
  const { pathname } = new URL(request.url);

  // Public routes
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Check authentication
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Protect /users routes - admin only
  if (pathname.startsWith("/users")) {
    if (!session.user.roles.includes("admin")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Protect /profile - any authenticated user (it's already accessible but let's confirm)
  // This is already public in the sense that authenticated users should access it

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
