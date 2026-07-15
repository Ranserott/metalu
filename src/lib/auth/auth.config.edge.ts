import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login", "/api/auth"];

// Prefixes that Supervisor is NOT allowed to visit. Admin and any other
// role with the matching canAccess("read") pass through. Used by the
// edge-safe middleware (this file) — kept as raw strings, not a
// permissions.ts import, because the edge runtime can't load the
// runtime-side permissions module.
const SUPERVISOR_BLOCKED_PREFIXES = [
  "/suppliers",
  "/purchases",
  "/billing",
  "/payments",
  "/reports",
  "/users",
];

function isSupervisorBlocked(pathname: string): boolean {
  return SUPERVISOR_BLOCKED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export const authConfigEdge = {
  providers: [],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
        return true;
      }

      if (!auth?.user) {
        return false;
      }

      const roles = (auth.user as { roles?: string[] }).roles ?? [];

      // Admin passes everything.
      if (roles.includes("Admin")) return true;

      // Supervisor: blocked from sensitive modules — typed URLs bounce to
      // /dashboard. The sidebar already hides these entries for them; this
      // is the safety net for direct URL access.
      if (roles.includes("Supervisor") && isSupervisorBlocked(pathname)) {
        return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
      }

      // /users is admin-only for every other role.
      if (pathname.startsWith("/users") && !roles.includes("Admin")) {
        return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
      }

      return true;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.roles = token.roles as string[];
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;