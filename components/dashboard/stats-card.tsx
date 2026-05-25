"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  delay?: number;
  suffix?: string;
}

export function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  gradient,
  delay = 0,
  suffix,
}: StatsCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 hover-lift cursor-default"
    >
      {/* Gradient accent */}
      <div
        className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-10 ${gradient}`}
      />

      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-11 h-11 rounded-xl ${gradient} flex items-center justify-center shadow-lg`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        {change !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              isPositive
                ? "bg-green-500/10 text-green-500"
                : "bg-red-500/10 text-red-500"
            )}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(change)}%
          </div>
        )}
      </div>

      <div>
        <p className="text-2xl font-bold mb-1">
          {typeof value === "number" ? formatNumber(value) : value}
          {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
        </p>
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
    </motion.div>
  );
}
