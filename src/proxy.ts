import NextAuth from "next-auth";
import { authConfigEdge } from "@/lib/auth/auth.config.edge";

const nextAuthInstance = NextAuth(authConfigEdge);

export const proxy = nextAuthInstance.auth;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
