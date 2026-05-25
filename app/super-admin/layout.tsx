"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSuperAdminStore } from "@/store/super-admin-store";
import { SuperAdminSidebar } from "@/components/super-admin/sidebar";

/** Decode the JWT payload and check the `exp` field (no library needed). */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return (payload.exp as number) < Date.now() / 1000;
  } catch {
    return true; // treat malformed token as expired
  }
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hasHydrated, token, logout } = useSuperAdminStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // ── Step 1: wait until zustand has restored state from localStorage ──────
    // Without this guard the layout would immediately redirect to /login on
    // every page load before the persisted auth state has been hydrated.
    if (!_hasHydrated) return;

    // ── Step 2: auto-logout if JWT has expired (12 h TTL) ────────────────────
    if (isAuthenticated && token && isTokenExpired(token)) {
      logout();
      return; // logout() sets isAuthenticated:false → next render re-enters this effect
    }

    // ── Step 3: redirect unauthenticated visitors to login ───────────────────
    if (!isAuthenticated && pathname !== "/super-admin/login") {
      router.replace("/super-admin/login");
    }
  }, [isAuthenticated, _hasHydrated, token, logout, pathname, router]);

  // Login page renders without the sidebar shell
  if (pathname === "/super-admin/login") {
    return <>{children}</>;
  }

  // Show a spinner while:
  //  · zustand is still hydrating from localStorage  (prevents flash-redirect)
  //  · authenticated=false while the redirect is in flight
  if (!_hasHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      <SuperAdminSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
