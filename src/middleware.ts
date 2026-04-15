import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const raw = process.env.ADMIN_EMAILS ?? "";
  const allowed = new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
  return allowed.has(normalized);
}

export default auth((req) => {
  const isAuth = !!req.auth;
  const path = req.nextUrl.pathname;
  const isDashboard = path.startsWith("/dashboard");
  const isDrivenGarage = path.startsWith("/driven/garage");
  const isDrivenAdmin = path.startsWith("/driven/admin");
  const isAuthPage = path.startsWith("/auth/");
  const isSuspended = Boolean((req.auth?.user as { suspendedAt?: string | null } | undefined)?.suspendedAt);

  if (isDrivenAdmin) {
    if (!isAuth) {
      const signIn = new URL("/auth/signin", req.nextUrl.origin);
      signIn.searchParams.set("callbackUrl", path);
      return Response.redirect(signIn);
    }
    if (!isAdminEmail(req.auth?.user?.email)) {
      return Response.redirect(new URL("/driven", req.nextUrl.origin));
    }
    return undefined;
  }

  if ((isDashboard || isDrivenGarage) && !isAuth) {
    const signIn = new URL("/auth/signin", req.nextUrl.origin);
    signIn.searchParams.set("callbackUrl", path);
    return Response.redirect(signIn);
  }
  if ((isDashboard || isDrivenGarage || isDrivenAdmin) && isAuth && isSuspended) {
    return Response.redirect(new URL("/auth/signout?suspended=1", req.nextUrl.origin));
  }
  if (isAuthPage && isAuth && path !== "/auth/signout") {
    return Response.redirect(new URL("/dashboard", req.nextUrl.origin));
  }
  return undefined;
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
