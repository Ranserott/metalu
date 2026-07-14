import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma/prisma";
import { authConfigEdge } from "./auth.config.edge";

export const authConfig = {
  ...authConfigEdge,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          console.log("[AUTH] Missing username or password");
          return null;
        }

        console.log("[AUTH] Trying to find user:", credentials.username);

        const user = await prisma.user.findFirst({
          where: { name: credentials.username as string, deletedAt: null },
          include: { roles: { include: { role: true } } },
        });

        console.log(
          "[AUTH] User found:",
          user ? { id: user.id, name: user.name, isActive: user.isActive } : null
        );

        if (!user || !user.isActive) {
          console.log("[AUTH] User not found or inactive");
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        console.log("[AUTH] Password valid:", isValid);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          roles: user.roles.map((ur) => ur.role.name),
        };
      },
    }),
  ],
  callbacks: {
    ...authConfigEdge.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roles = (user as any).roles;
      }
      return token;
    },
  },
};
