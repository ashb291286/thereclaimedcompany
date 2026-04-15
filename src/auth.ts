import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import type { PrismaClient } from "@/generated/prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma as unknown as PrismaClient),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: String(credentials.email) },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            password: true,
            suspendedAt: true,
          },
        });
        if (!user?.password) return null;
        if (user.suspendedAt) return null;
        const ok = await compare(String(credentials.password), user.password);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const userId = (user?.id ?? token.id) as string | undefined;
      if (userId) {
        token.id = userId;
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true, suspendedAt: true },
        });
        token.role = dbUser?.role ?? null;
        token.suspendedAt = dbUser?.suspendedAt?.toISOString() ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "individual" | "reclamation_yard" | null;
        session.user.suspendedAt = (token.suspendedAt as string | null | undefined) ?? null;
      }
      return session;
    },
  },
});
