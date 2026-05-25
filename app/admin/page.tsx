"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BarChart3,
  Camera,
  Cloud,
  Eye,
  Image,
  Layers,
  TrendingUp,
  Upload,
  Users,
  Zap,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { StatsCard } from "@/components/dashboard/stats-card";
import { RecentUploads } from "@/components/dashboard/recent-uploads";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { UploadTrendChart } from "@/components/dashboard/upload-trend-chart";
import { formatBytes } from "@/lib/utils";

async function fetchDashboardStats() {
  const res = await fetch("/api/dashboard/stats", {
    headers: {
      Authorization: `Bearer ${document.cookie.match(/auth-token=([^;]+)/)?.[1] || ""}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch stats");
  const data = await res.json();
  return data.data;
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    refetchInterval: 30000,
  });

  const statCards = [
    {
      title: "Total Events",
      value: stats?.totalEvents ?? 0,
      change: 12,
      icon: Layers,
      gradient: "bg-gradient-to-br from-rose-500 to-pink-600",
    },
    {
      title: "Total Photos",
      value: stats?.totalPhotos ?? 0,
      change: 8,
      icon: Image,
      gradient: "bg-gradient-to-br from-violet-500 to-purple-600",
    },
    {
      title: "Total Videos",
      value: stats?.totalVideos ?? 0,
      change: 15,
      icon: Camera,
      gradient: "bg-gradient-to-br from-blue-500 to-cyan-600",
    },
    {
      title: "Storage Used",
      value: stats ? formatBytes(stats.storageUsed) : "0 GB",
      icon: Cloud,
      gradient: "bg-gradient-to-br from-amber-500 to-yellow-600",
    },
    {
      title: "Event Visitors",
      value: stats?.totalVisitors ?? 0,
      change: 22,
      icon: Eye,
      gradient: "bg-gradient-to-br from-green-500 to-emerald-600",
    },
    {
      title: "Face Matches",
      value: stats?.faceMatchCount ?? 0,
      change: 35,
      icon: Users,
      gradient: "bg-gradient-to-br from-teal-500 to-cyan-600",
    },
    {
      title: "Live Uploads",
      value: stats?.liveUploads ?? 0,
      icon: Upload,
      gradient: "bg-gradient-to-br from-orange-500 to-red-600",
    },
    {
      title: "Revenue",
      value: `₹${stats?.revenue?.toLocaleString() ?? "0"}`,
      change: 18,
      icon: TrendingUp,
      gradient: "bg-gradient-to-br from-pink-500 to-rose-600",
    },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Dashboard" subtitle="Welcome back! Here's what's happening." />

      <div className="p-6 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <StatsCard
              key={i}
              title={card.title}
              value={isLoading ? "..." : card.value}
              change={"change" in card ? card.change : undefined}
              icon={card.icon}
              gradient={card.gradient}
              delay={i * 0.05}
            />
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <UploadTrendChart data={stats?.uploadTrend} isLoading={isLoading} />
          </div>
          <div>
            <ActivityTimeline activities={stats?.activityTimeline} isLoading={isLoading} />
          </div>
        </div>

        {/* Recent Uploads */}
        <RecentUploads photos={stats?.recentPhotos} isLoading={isLoading} />
      </div>
    </div>
  );
}
