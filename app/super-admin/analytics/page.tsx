"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Building2,
  Camera,
  HardDrive,
  Image,
  TrendingUp,
  Upload,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { useSuperAdminStore } from "@/store/super-admin-store";
import { StorageBar } from "@/components/super-admin/storage-bar";
import { formatBytes, formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface LiveData {
  timestamp: string;
  totalStudios: number;
  activeStudios: number;
  totalPhotos: number;
  totalStorageUsed: number;
  totalStorageLimit: number;
  uploadsLastMinute: number;
  uploadsLastHour: number;
  uploadsLast24h: number;
  activeEventsCount: number;
  recentActivity: Array<{
    _id: string;
    studioId: string;
    type: string;
    description: string;
    createdAt: string;
  }>;
  studioBreakdown: Array<{
    studioId: string;
    name: string;
    storageUsed: number;
    storageLimit: number;
    status: string;
    photosCount: number;
    eventsCount: number;
  }>;
  hourlyUploads: Array<{ time: string; count: number }>;
}

function LiveMetricCard({
  title,
  value,
  icon: Icon,
  gradient,
  sub,
  delay = 0,
  pulse,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  sub?: string;
  delay?: number;
  pulse?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5"
    >
      {pulse && (
        <motion.div
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-500"
        />
      )}
      <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-10 ${gradient}`} />
      <div className={`w-10 h-10 rounded-xl ${gradient} flex items-center justify-center mb-3 shadow-lg`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-xl font-bold text-white">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      <p className="text-xs text-white/40 mt-0.5">{title}</p>
      {sub && <p className="text-[10px] text-white/25 mt-1">{sub}</p>}
    </motion.div>
  );
}

// Simple bar sparkline using divs
function MiniBarChart({ data }: { data: Array<{ time: string; count: number }> }) {
  if (!data || data.length === 0) {
    return <div className="h-16 flex items-center justify-center text-xs text-white/20">No data</div>;
  }

  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-0.5 h-16">
      {data.slice(-40).map((d, i) => (
        <div
          key={i}
          className="flex-1 bg-violet-500/60 rounded-t-sm min-w-[3px]"
          style={{ height: `${(d.count / max) * 100}%` }}
          title={`${d.time}: ${d.count}`}
        />
      ))}
    </div>
  );
}

export default function LiveAnalyticsPage() {
  const { token } = useSuperAdminStore();
  const [data, setData] = useState<LiveData | null>(null);
  const [connected, setConnected] = useState(false);
  const [tickCount, setTickCount] = useState(0);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const connect = () => {
      const es = new EventSource("/api/super-admin/analytics/stream", { withCredentials: true });
      esRef.current = es;

      es.onopen = () => setConnected(true);

      es.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (!parsed.error) {
            setData(parsed);
            setTickCount((c) => c + 1);
          }
        } catch { /* ignore */ }
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        setTimeout(connect, 5000);
      };
    };

    connect();
    return () => esRef.current?.close();
  }, [token]);

  const metrics = data
    ? [
        {
          title: "Uploads / min",
          value: data.uploadsLastMinute,
          icon: Upload,
          gradient: "bg-gradient-to-br from-violet-500 to-purple-600",
          sub: `${data.uploadsLastHour} last hour`,
          pulse: true,
        },
        {
          title: "Total Photos",
          value: data.totalPhotos,
          icon: Image,
          gradient: "bg-gradient-to-br from-pink-500 to-rose-600",
          sub: `${data.uploadsLast24h} in 24h`,
        },
        {
          title: "Active Studios",
          value: data.activeStudios,
          icon: Building2,
          gradient: "bg-gradient-to-br from-blue-500 to-cyan-600",
          sub: `${data.totalStudios} total`,
        },
        {
          title: "Live Events",
          value: data.activeEventsCount,
          icon: Camera,
          gradient: "bg-gradient-to-br from-emerald-500 to-green-600",
          pulse: data.activeEventsCount > 0,
        },
        {
          title: "Platform Storage",
          value: formatBytes(data.totalStorageUsed),
          icon: HardDrive,
          gradient: "bg-gradient-to-br from-amber-500 to-yellow-600",
        },
        {
          title: "Storage Utilization",
          value: data.totalStorageLimit > 0
            ? `${((data.totalStorageUsed / data.totalStorageLimit) * 100).toFixed(1)}%`
            : "0%",
          icon: BarChart3,
          gradient: "bg-gradient-to-br from-teal-500 to-cyan-600",
          sub: `of ${formatBytes(data.totalStorageLimit)} allocated`,
        },
      ]
    : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Live Analytics</h1>
            <p className="text-sm text-white/40">Real-time platform monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {connected ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full text-green-400">
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-green-500"
              />
              <Wifi className="w-3.5 h-3.5" />
              <span>Live · {tickCount} ticks</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full text-red-400">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Reconnecting...</span>
            </div>
          )}
        </div>
      </div>

      {/* Live Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {!data
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 bg-white/5 rounded-2xl border border-white/10 animate-pulse" />
            ))
          : metrics.map((m, i) => (
              <LiveMetricCard
                key={i}
                title={m.title}
                value={m.value}
                icon={m.icon}
                gradient={m.gradient}
                sub={m.sub}
                delay={i * 0.04}
                pulse={m.pulse}
              />
            ))}
      </div>

      {/* Upload rate chart */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-400" />
            Upload Rate (Last Hour)
          </h2>
          {data && (
            <span className="text-xs text-white/30">
              {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
        {data ? (
          <MiniBarChart data={data.hourlyUploads} />
        ) : (
          <div className="h-16 bg-white/5 rounded-xl animate-pulse" />
        )}
        <p className="text-[10px] text-white/20 mt-2">Each bar = one minute bucket</p>
      </div>

      {/* Studio Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Per-studio storage */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-amber-400" />
            Studio Storage Breakdown
          </h2>
          <div className="space-y-4 max-h-80 overflow-y-auto scrollbar-thin pr-1">
            {!data ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
              ))
            ) : data.studioBreakdown.length === 0 ? (
              <p className="text-xs text-white/30 text-center py-6">No studios yet</p>
            ) : (
              data.studioBreakdown.map((s, i) => (
                <motion.div
                  key={s.studioId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/70 font-medium truncate max-w-[180px]">{s.name}</span>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full",
                          s.status === "active"
                            ? "bg-green-500/10 text-green-400"
                            : s.status === "suspended"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-blue-500/10 text-blue-400"
                        )}
                      >
                        {s.status}
                      </span>
                    </div>
                  </div>
                  <StorageBar used={s.storageUsed} limit={s.storageLimit} height="sm" showLabels={true} />
                  <div className="flex gap-4 text-[10px] text-white/25 mt-0.5">
                    <span>{s.photosCount} photos</span>
                    <span>{s.eventsCount} events</span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-400" />
            Live Activity Feed
          </h2>
          <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin pr-1">
            {!data ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
              ))
            ) : data.recentActivity.length === 0 ? (
              <div className="text-center py-8 text-xs text-white/20">
                {connected ? "No recent activity" : "Connecting..."}
              </div>
            ) : (
              data.recentActivity.map((a) => (
                <motion.div
                  key={a._id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/10"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/70">{a.description}</p>
                    <div className="flex gap-2 text-[10px] text-white/30 mt-0.5">
                      <span className="font-mono">{a.studioId}</span>
                      <span>·</span>
                      <span>{a.type.replace(/_/g, " ")}</span>
                      <span>·</span>
                      <span>{new Date(a.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
