"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Image,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StorageBar } from "@/components/super-admin/storage-bar";
import { formatBytes, formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Studio {
  studioId: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  plan: string;
  status: string;
  storageUsed: number;
  storageLimit: number;
  photosCount: number;
  eventsCount: number;
  lastActivity?: string;
  createdAt: string;
}

const statusConfig = {
  active: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: "Active" },
  trial: { icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10", label: "Trial" },
  suspended: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Suspended" },
  pending: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10", label: "Pending" },
};

const planColors: Record<string, string> = {
  trial: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  starter: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  professional: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  enterprise: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

interface StudioCardProps {
  studio: Studio;
  delay?: number;
  onStorageClick?: (studio: Studio) => void;
  onSuspendClick?: (studio: Studio) => void;
}

export function StudioCard({ studio, delay = 0, onStorageClick, onSuspendClick }: StudioCardProps) {
  const status = statusConfig[studio.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;
  const storagePct = studio.storageLimit > 0 ? (studio.storageUsed / studio.storageLimit) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="group relative rounded-2xl border border-border/50 bg-card p-5 hover:border-violet-500/30 transition-all hover:shadow-lg hover:shadow-violet-500/5"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <Link href={`/super-admin/studios/${studio.studioId}`} className="flex items-center gap-3 group/header">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/20 flex items-center justify-center group-hover/header:border-violet-500/50 transition-colors">
            <Building2 className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="font-semibold text-sm group-hover/header:text-violet-400 transition-colors">{studio.name}</h3>
            <p className="text-xs text-muted-foreground font-mono">{studio.studioId}</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs px-2 py-0.5 rounded-full border capitalize", planColors[studio.plan] || planColors.trial)}>
            {studio.plan}
          </span>
          <div className={cn("flex items-center gap-1 text-xs px-2 py-0.5 rounded-full", status.bg, status.color)}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </div>
        </div>
      </div>

      {/* Owner */}
      <p className="text-xs text-muted-foreground mb-3 truncate">
        {studio.ownerName} · {studio.ownerEmail}
      </p>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Image className="w-3.5 h-3.5 text-violet-400" />
          <span>{(studio.photosCount ?? 0).toLocaleString()} photos</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Camera className="w-3.5 h-3.5 text-pink-400" />
          <span>{studio.eventsCount} events</span>
        </div>
      </div>

      {/* Storage */}
      <div className="mb-4">
        <StorageBar used={studio.storageUsed} limit={studio.storageLimit} height="md" />
        {storagePct >= 80 && (
          <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Storage {storagePct >= 90 ? "critical" : "high"}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onStorageClick?.(studio)}
          className="flex-1 text-xs py-1.5 px-3 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors border border-violet-500/20 font-medium"
        >
          Set Storage
        </button>
        <button
          onClick={() => onSuspendClick?.(studio)}
          className={cn(
            "flex-1 text-xs py-1.5 px-3 rounded-lg transition-colors border font-medium",
            studio.status === "suspended"
              ? "bg-green-500/10 text-green-400 hover:bg-green-500/20 border-green-500/20"
              : "bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20"
          )}
        >
          {studio.status === "suspended" ? "Activate" : "Suspend"}
        </button>
        <Link href={`/super-admin/studios/${studio.studioId}`}>
          <button className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </Link>
      </div>

      {studio.lastActivity && (
        <p className="text-[10px] text-muted-foreground mt-3">
          Last active {formatRelativeTime(studio.lastActivity)}
        </p>
      )}
    </motion.div>
  );
}
