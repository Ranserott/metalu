import NextAuth from "next-auth";
import { middlewareAuthConfig } from "./middleware-auth-config";

export const { auth } = NextAuth(middlewareAuthConfig);
