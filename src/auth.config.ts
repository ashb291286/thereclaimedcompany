import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config used by middleware. No Prisma or Node-only modules.
 */
export const authConfig: NextAuthConfig = {
  providers: [],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/auth/signin",
  },
};
