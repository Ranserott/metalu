import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login", "/api/auth"];

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

      if (pathname.startsWith("/users")) {
        const roles = (auth.user as { roles?: string[] }).roles ?? [];
        if (!roles.includes("Admin")) {
          return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
        }
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
  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;
