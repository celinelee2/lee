import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  providers: [],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const isPublic =
        pathname === "/login" ||
        pathname === "/forgot-password" ||
        pathname.startsWith("/reset-password") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/debug");

      if (isPublic) return true;
      if (!isLoggedIn) return false;

      const role = (auth?.user as { role?: string })?.role;

      if (pathname.startsWith("/admin/hr") || pathname.startsWith("/api/admin/hr")) {
        return role === "ADMIN" || role === "HR_ADMIN";
      }

      if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
        if (role !== "ADMIN" && role !== "HR_ADMIN") return false;
        if (role === "HR_ADMIN") {
          const allowed = ["/admin/hr", "/admin/legal-entities", "/api/admin/hr", "/api/admin/legal-entities"];
          return allowed.some((p) => pathname.startsWith(p));
        }
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
};
