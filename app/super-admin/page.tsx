"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BarChart3,
  Building2,
  Camera,
  HardDrive,
  Image,
  Shield,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useSuperAdminStore } from "@/store/super-admin-store";
import { RealTimeFeed } from "@/components/super-admin/real-time-feed";
import { StorageBar } from "@/components/super-admin/storage-bar";
import { formatBytes, formatNumber } from "@/lib/utils";

async function fetchStats(token: string | null) {
  const res = await fetch("/api/super-admin/stats", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed");
  const data = await res.json();
  return data.data;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  sub?: string;
  delay?: number;
}

function StatCard({ title, value, icon: Icon, gradient, sub, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5"
    >
      <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-15 ${gradient}`} />
      <div className={`w-10 h-10 rounded-xl ${gradient} flex items-center justify-center mb-3 shadow-lg`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-xl font-bold text-white">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      <p className="text-xs text-white/50 mt-0.5">{title}</p>
      {sub && <p className="text-[10px] text-white/30 mt-1">{sub}</p>}
    </motion.div>
  );
}

export default function SuperAdminOverview() {
  const { token } = useSuperAdminStore();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["super-admin-stats"],
    queryFn: () => fetchStats(token),
    refetchInterval: 30000,
    enabled: !!token,
  });

  const cards = [
    {
      title: "Total Studios",
      value: stats?.totalStudios ?? 0,
      icon: Building2,
      gradient: "bg-gradient-to-br from-violet-500 to-purple-600",
      sub: `${stats?.activeStudios ?? 0} active · ${stats?.trialStudios ?? 0} trial`,
    },
    {
      title: "Total Photos",
      value: stats?.totalPhotos ?? 0,
      icon: Image,
      gradient: "bg-gradient-to-br from-pink-500 to-rose-600",
      sub: "Across all studios",
    },
    {
      title: "Total Events",
      value: stats?.totalEvents ?? 0,
      icon: Camera,
      gradient: "bg-gradient-to-br from-blue-500 to-cyan-600",
    },
    {
      title: "Total Users",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      gradient: "bg-gradient-to-br from-emerald-500 to-green-600",
    },
    {
      title: "Platform Storage",
      value: stats ? formatBytes(stats.totalStorageUsed) : "0 GB",
      icon: HardDrive,
      gradient: "bg-gradient-to-br from-amber-500 to-yellow-600",
    },
    {
      title: "New This Week",
      value: stats?.newStudiosThisWeek ?? 0,
      icon: TrendingUp,
      gradient: "bg-gradient-to-br from-teal-500 to-cyan-600",
      sub: "New studios",
    },
    {
      title: "Suspended",
      value: stats?.suspendedStudios ?? 0,
      icon: Shield,
      gradient: "bg-gradient-to-br from-red-500 to-rose-600",
    },
    {
      title: "Analytics",
      value: "Live",
      icon: Zap,
      gradient: "bg-gradient-to-br from-orange-500 to-amber-600",
      sub: "Real-time stream",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Platform Overview</h1>
          <p className="text-sm text-white/40">Memorable Pictures · SaaS Control Center</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <StatCard
            key={i}
            title={card.title}
            value={isLoading ? "..." : card.value}
            icon={card.icon}
            gradient={card.gradient}
            sub={isLoading ? undefined : card.sub}
            delay={i * 0.05}
          />
        ))}
      </div>

      {/* Top Studios + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top studios by storage */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-amber-400" />
            Top Studios by Storage
          </h2>
          <div className="space-y-4">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />
                ))
              : (stats?.topStudios || []).map((s: {
                  studioId: string;
                  name: string;
                  storageUsed: number;
                  storageLimit: number;
                  status: string;
                }) => (
                  <div key={s.studioId}>
                    <div className="flex justify-between text-xs text-white/60 mb-1.5">
                      <span className="font-medium text-white/80">{s.name}</span>
                      <span className="font-mono text-white/40">{s.studioId}</span>
                    </div>
                    <StorageBar used={s.storageUsed} limit={s.storageLimit} height="sm" />
                  </div>
                ))}
          </div>
        </div>

        {/* Real-time feed */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-violet-400" />
            Live Activity Feed
          </h2>
          <RealTimeFeed token={token} />
        </div>
      </div>

      {/* Plan breakdown */}
      {stats?.storageByPlan && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Studios by Plan</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.storageByPlan.map((p: { _id: string; count: number; storage: number }) => (
              <div key={p._id} className="bg-white/5 rounded-xl p-3 border border-white/10">
                <p className="text-xs text-white/40 capitalize mb-1">{p._id}</p>
                <p className="text-lg font-bold text-white">{p.count}</p>
                <p className="text-[10px] text-white/30">{formatBytes(p.storage)} used</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
