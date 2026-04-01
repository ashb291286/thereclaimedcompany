import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isAuth = !!req.auth;
  const path = req.nextUrl.pathname;
  const isDashboard = path.startsWith("/dashboard");
  const isAuthPage = path.startsWith("/auth/");

  if (isDashboard && !isAuth) {
    const signIn = new URL("/auth/signin", req.nextUrl.origin);
    signIn.searchParams.set("callbackUrl", path);
    return Response.redirect(signIn);
  }
  if (isAuthPage && isAuth && path !== "/auth/signout") {
    return Response.redirect(new URL("/dashboard", req.nextUrl.origin));
  }
  return undefined;
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
