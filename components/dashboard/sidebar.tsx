"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Calendar,
  Camera,
  ChevronLeft,
  CreditCard,
  HardDrive,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useUIStore } from "@/store/ui-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StorageModal } from "@/components/dashboard/storage-modal";
import toast from "react-hot-toast";

const navItems = [
  { href: "/admin",           icon: LayoutDashboard, label: "Dashboard", exact: true },
  { href: "/admin/events",    icon: Calendar,        label: "Events" },
  { href: "/admin/gallery",   icon: ImageIcon,       label: "Gallery" },
  { href: "/admin/analytics", icon: BarChart3,       label: "Analytics" },
  { href: "/admin/team",      icon: Users,           label: "Team" },
  { href: "/admin/billing",   icon: CreditCard,      label: "Billing" },
  { href: "/admin/settings",  icon: Settings,        label: "Settings" },
];

interface StudioInfo {
  name: string;
  logo?: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const { mobileSidebarOpen, setMobileSidebarOpen } = useUIStore();
  const [collapsed, setCollapsed] = useState(false);
  const [storageOpen, setStorageOpen] = useState(false);
  const [studioInfo, setStudioInfo] = useState<StudioInfo | null>(null);

  // Fetch studio name + logo once on mount whenever there is a studioId
  useEffect(() => {
    if (!user?.studioId || !token) return;

    const ctrl = new AbortController();
    fetch("/api/studio/settings", {
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setStudioInfo({ name: json.data.name, logo: json.data.logo });
        }
      })
      .catch(() => {/* ignore abort / network errors */});

    return () => ctrl.abort();
  }, [user?.studioId, token]);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    router.push("/login");
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const closeMobile = () => setMobileSidebarOpen(false);

  // Display name: studio name (if known) else "Memorable Pictures"
  const displayName = studioInfo?.name ?? "Memorable";
  const displaySub  = studioInfo?.name ? null : "Pictures";

  return (
    <>
      {/* ── Mobile backdrop ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMobile}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "flex flex-col h-screen bg-sidebar border-r border-sidebar-border z-50 transition-all duration-300",
          // mobile: fixed drawer
          "fixed inset-y-0 left-0 w-[264px]",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
          // desktop: static, always visible, collapsible width
          "lg:static lg:translate-x-0",
          collapsed ? "lg:w-[76px]" : "lg:w-[240px]"
        )}
      >
        {/* Logo / Studio Name */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border min-h-[72px]">
          {/* Studio logo or default camera icon */}
          <div className="w-9 h-9 shrink-0 rounded-xl overflow-hidden shadow-lg">
            {studioInfo?.logo ? (
              <Image
                src={studioInfo.logo}
                alt={studioInfo.name}
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
            )}
          </div>

          <div className={cn("overflow-hidden", collapsed && "lg:hidden")}>
            <p className="font-bold text-sm text-sidebar-foreground leading-tight truncate max-w-[160px]">
              {displayName}
              {displaySub && (
                <span className="text-primary"> {displaySub}</span>
              )}
            </p>
            {studioInfo?.name && (
              <p className="text-[10px] text-muted-foreground">Photography Studio</p>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} onClick={closeMobile}>
              <div
                className={cn(
                  "sidebar-item",
                  isActive(item.href, item.exact) && "active",
                  collapsed && "lg:justify-center lg:px-0"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className={cn("whitespace-nowrap", collapsed && "lg:hidden")}>
                  {item.label}
                </span>
              </div>
            </Link>
          ))}

          {/* Storage — opens a modal instead of navigating */}
          <button
            type="button"
            onClick={() => { setStorageOpen(true); closeMobile(); }}
            className={cn(
              "sidebar-item w-full",
              collapsed && "lg:justify-center lg:px-0"
            )}
            title={collapsed ? "Storage" : undefined}
          >
            <HardDrive className="w-5 h-5 shrink-0" />
            <span className={cn("whitespace-nowrap", collapsed && "lg:hidden")}>
              Storage
            </span>
          </button>
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-sidebar-border">
          <div
            className={cn(
              "flex items-center gap-3 p-2 rounded-xl hover:bg-sidebar-accent group",
              collapsed && "lg:justify-center"
            )}
          >
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                {user?.name ? getInitials(user.name) : "MP"}
              </AvatarFallback>
            </Avatar>
            <div className={cn("flex-1 overflow-hidden min-w-0", collapsed && "lg:hidden")}>
              <p className="text-xs font-semibold truncate text-sidebar-foreground">
                {user?.name || "Admin"}
              </p>
              <p className="text-xs text-muted-foreground truncate capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className={cn(
                "p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all shrink-0",
                collapsed && "lg:hidden"
              )}
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-background border border-border rounded-full items-center justify-center shadow-sm hover:shadow-md transition-shadow z-10"
        >
          <ChevronLeft
            className={cn(
              "w-3.5 h-3.5 text-muted-foreground transition-transform duration-300",
              collapsed && "rotate-180"
            )}
          />
        </button>
      </aside>

      {/* Storage modal */}
      <StorageModal open={storageOpen} onClose={() => setStorageOpen(false)} />
    </>
  );
}
