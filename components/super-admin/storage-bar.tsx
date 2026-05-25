"use client";

import { motion } from "framer-motion";
import { formatBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface StorageBarProps {
  used: number;
  limit: number;
  showLabels?: boolean;
  height?: "sm" | "md" | "lg";
  className?: string;
}

export function StorageBar({ used, limit, showLabels = true, height = "md", className }: StorageBarProps) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

  const color =
    pct >= 90
      ? "from-red-500 to-rose-600"
      : pct >= 70
      ? "from-amber-500 to-yellow-600"
      : "from-violet-500 to-purple-600";

  const h = { sm: "h-1.5", md: "h-2.5", lg: "h-4" }[height];

  return (
    <div className={cn("w-full", className)}>
      {showLabels && (
        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
          <span>{formatBytes(used)}</span>
          <span className={pct >= 90 ? "text-red-500 font-medium" : ""}>
            {pct.toFixed(1)}% of {formatBytes(limit)}
          </span>
        </div>
      )}
      <div className={cn("w-full bg-white/10 rounded-full overflow-hidden", h)}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={cn("h-full rounded-full bg-gradient-to-r", color)}
        />
      </div>
    </div>
  );
}
