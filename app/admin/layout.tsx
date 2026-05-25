"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { PaymentGate } from "@/components/dashboard/payment-gate";
import { useAuthStore } from "@/store/auth-store";

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return (payload.exp as number) < Date.now() / 1000;
  } catch {
    return true;
  }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hasHydrated, token, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!_hasHydrated) return;

    if (isAuthenticated && token && isTokenExpired(token)) {
      logout();
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, _hasHydrated, token, logout, router]);

  if (!_hasHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex flex-col flex-1 overflow-y-auto scrollbar-thin">
        <PaymentGate>{children}</PaymentGate>
      </main>
    </div>
  );
}
