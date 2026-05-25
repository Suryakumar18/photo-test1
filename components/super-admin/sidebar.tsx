"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BarChart3,
  Building2,
  ChevronLeft,
  CreditCard,
  HardDrive,
  LayoutDashboard,
  LogOut,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSuperAdminStore } from "@/store/super-admin-store";
import { useState } from "react";
import toast from "react-hot-toast";

const navItems = [
  { href: "/super-admin",           icon: LayoutDashboard, label: "Overview",       exact: true },
  { href: "/super-admin/studios",   icon: Building2,       label: "Studios" },
  { href: "/super-admin/billing",   icon: CreditCard,      label: "Billing" },
  { href: "/super-admin/analytics", icon: BarChart3,       label: "Live Analytics" },
];

export function SuperAdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { email, logout } = useSuperAdminStore();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const handleLogout = async () => {
    await fetch("/api/super-admin/auth", { method: "DELETE" });
    logout();
    toast.success("Logged out");
    router.push("/super-admin/login");
  };

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen border-r border-border z-50 transition-all duration-300 shrink-0",
        "bg-gradient-to-b from-slate-950 to-slate-900",
        collapsed ? "w-[76px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div className={cn("overflow-hidden whitespace-nowrap", collapsed && "hidden")}>
          <span className="font-bold text-sm text-white">Super</span>
          <span className="font-bold text-sm text-violet-400"> Admin</span>
          <p className="text-[10px] text-white/40 mt-0.5">Platform Control</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <motion.div
              whileHover={{ x: collapsed ? 0 : 2 }}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all",
                isActive(item.href, item.exact)
                  ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                  : "text-white/60 hover:text-white hover:bg-white/5",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </motion.div>
          </Link>
        ))}
      </nav>

      {/* Storage indicator */}
      {!collapsed && (
        <div className="px-4 py-3 mx-3 mb-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs text-white/60">Platform Storage</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full" />
          </div>
          <p className="text-[10px] text-white/40 mt-1">Bunny CDN · wowlifestyle123</p>
        </div>
      )}

      {/* User */}
      <div className="px-3 py-4 border-t border-white/10">
        <div
          className={cn(
            "flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 group",
            collapsed && "justify-center"
          )}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 overflow-hidden min-w-0">
                <p className="text-xs font-semibold text-white truncate">Super Admin</p>
                <p className="text-[10px] text-white/40 truncate">{email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-white/40 transition-all shrink-0"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-slate-800 border border-white/10 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow z-10"
      >
        <ChevronLeft
          className={cn(
            "w-3.5 h-3.5 text-white/60 transition-transform duration-300",
            collapsed && "rotate-180"
          )}
        />
      </button>
    </aside>
  );
}
