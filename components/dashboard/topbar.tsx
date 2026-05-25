"use client";

import { Bell, Menu, Search } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/auth-store";
import { useUIStore } from "@/store/ui-store";
import { getInitials } from "@/lib/utils";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const { user } = useAuthStore();
  const { toggleMobileSidebar } = useUIStore();

  return (
    <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-sm flex items-center px-4 sm:px-6 gap-3 sm:gap-4 sticky top-0 z-40">
      {/* Mobile menu button */}
      <button
        onClick={toggleMobileSidebar}
        className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-muted transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base sm:text-lg font-semibold truncate">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>

      {/* Search */}
      <div className="hidden md:block w-64">
        <Input
          placeholder="Search..."
          icon={<Search className="w-4 h-4" />}
          className="h-9 text-sm"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button variant="ghost" size="icon-sm" className="relative rounded-full">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
        </Button>
        <ThemeToggle />
        <Avatar className="w-8 h-8 cursor-pointer">
          <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
            {user?.name ? getInitials(user.name) : "MP"}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
