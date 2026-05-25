"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Building2,
  Camera,
  Download,
  Eye,
  HardDrive,
  LogIn,
  Shield,
  Upload,
  Wifi,
  WifiOff,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ActivityItem {
  _id: string;
  studioId: string;
  type: string;
  description: string;
  createdAt: string;
}

interface RealTimeData {
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
  recentActivity: ActivityItem[];
  studioBreakdown: Array<{
    studioId: string;
    name: string;
    storageUsed: number;
    storageLimit: number;
    status: string;
    photosCount: number;
  }>;
  hourlyUploads: Array<{ time: string; count: number }>;
}

const activityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  upload: Upload,
  event_created: Camera,
  face_match: Eye,
  download: Download,
  login: LogIn,
  storage_limit_set: HardDrive,
  studio_created: Building2,
  studio_suspended: Shield,
  studio_activated: Shield,
};

const activityColors: Record<string, string> = {
  upload: "text-violet-400",
  event_created: "text-pink-400",
  face_match: "text-cyan-400",
  download: "text-blue-400",
  login: "text-green-400",
  storage_limit_set: "text-amber-400",
  studio_created: "text-emerald-400",
  studio_suspended: "text-red-400",
  studio_activated: "text-green-400",
};

interface RealTimeFeedProps {
  token: string | null;
}

export function RealTimeFeed({ token }: RealTimeFeedProps) {
  const [data, setData] = useState<RealTimeData | null>(null);
  const [connected, setConnected] = useState(false);
  const [pulse, setPulse] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const url = token
      ? `/api/super-admin/analytics/stream`
      : null;

    if (!url) return;

    const connect = () => {
      const es = new EventSource(url, { withCredentials: true });
      esRef.current = es;

      es.onopen = () => setConnected(true);

      es.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (!parsed.error) {
            setData(parsed);
            setPulse(true);
            setTimeout(() => setPulse(false), 500);
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

    return () => {
      esRef.current?.close();
    };
  }, [token]);

  return (
    <div className="space-y-4">
      {/* Connection status */}
      <div className="flex items-center gap-2 text-xs">
        {connected ? (
          <>
            <motion.div
              animate={{ scale: pulse ? 1.3 : 1 }}
              transition={{ duration: 0.2 }}
              className="w-2 h-2 rounded-full bg-green-500"
            />
            <Wifi className="w-3.5 h-3.5 text-green-500" />
            <span className="text-green-500 font-medium">Live · updates every 4s</span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <WifiOff className="w-3.5 h-3.5 text-red-500" />
            <span className="text-red-500">Reconnecting...</span>
          </>
        )}
        {data && (
          <span className="ml-auto text-muted-foreground">
            {new Date(data.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Activity feed */}
      <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin pr-1">
        <AnimatePresence mode="popLayout">
          {(data?.recentActivity || []).map((item) => {
            const Icon = activityIcons[item.type] || Activity;
            const color = activityColors[item.type] || "text-muted-foreground";

            return (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.3 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className={cn("mt-0.5 shrink-0", color)}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground leading-relaxed">{item.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-muted-foreground">{item.studioId}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {(!data || data.recentActivity.length === 0) && (
          <div className="text-center py-8 text-muted-foreground text-xs">
            {connected ? "No recent activity" : "Connecting to stream..."}
          </div>
        )}
      </div>
    </div>
  );
}
