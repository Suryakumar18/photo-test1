import { NextRequest, NextResponse } from "next/server";

/**
 * Edge middleware — runs before any page renders.
 *
 * Rules:
 *  • /admin/**          → needs valid "auth-token" cookie  → else redirect /login
 *  • /super-admin/**    → needs valid "super-admin-token"  → else redirect /super-admin/login
 *    (except /super-admin/login itself which is always public)
 *
 * Full JWT cryptographic verification happens inside API routes and layouts.
 * Here we do a lightweight check:
 *   1. Cookie present at all?          → redirect if missing
 *   2. JWT exp field not in the past?  → redirect if expired (base64 decode only, no crypto)
 */

function isJwtExpired(token: string): boolean {
  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return true;
    const payload = JSON.parse(atob(payloadBase64));
    if (typeof payload.exp !== "number") return false; // no exp → treat as valid
    return payload.exp < Math.floor(Date.now() / 1000);
  } catch {
    return true; // malformed → treat as expired
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Super admin routes ─────────────────────────────────────────────────────
  if (
    pathname.startsWith("/super-admin") &&
    pathname !== "/super-admin/login"
  ) {
    const token = req.cookies.get("super-admin-token")?.value;

    if (!token || isJwtExpired(token)) {
      const loginUrl = new URL("/super-admin/login", req.url);
      const res = NextResponse.redirect(loginUrl);
      // Clear stale cookie so the login page starts fresh
      if (token) res.cookies.delete("super-admin-token");
      return res;
    }
  }

  // ── Studio admin / photographer routes ────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    const token = req.cookies.get("auth-token")?.value;

    if (!token || isJwtExpired(token)) {
      const loginUrl = new URL("/login", req.url);
      const res = NextResponse.redirect(loginUrl);
      if (token) res.cookies.delete("auth-token");
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  // Only run middleware on these paths — skip _next, api, static assets
  matcher: ["/admin/:path*", "/super-admin/:path*"],
};
