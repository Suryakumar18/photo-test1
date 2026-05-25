"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Building2,
  Camera,
  CheckCircle2,
  Eye,
  ExternalLink,
  HardDrive,
  Image as ImageIcon,
  Mail,
  Phone,
  Shield,
  UserCheck,
  UserX,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { useSuperAdminStore } from "@/store/super-admin-store";
import { StorageBar } from "@/components/super-admin/storage-bar";
import { formatBytes, formatDate, formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface StudioUser {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "photographer";
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

interface StudioPhoto {
  _id: string;
  cdnUrl: string;
  thumbnailUrl?: string;
  filename: string;
  originalName?: string;
  size: number;
  createdAt: string;
}

interface StudioEvent {
  _id: string;
  title: string;
  status: string;
  photosCount: number;
  storageUsed: number;
  eventDate?: string;
  createdAt: string;
  slug?: string;
}

const planColors: Record<string, string> = {
  trial: "bg-slate-500/20 text-slate-300",
  starter: "bg-blue-500/20 text-blue-300",
  professional: "bg-violet-500/20 text-violet-300",
  enterprise: "bg-amber-500/20 text-amber-300",
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
  settings_updated: "text-sky-400",
};

async function fetchStudio(token: string | null, studioId: string) {
  const res = await fetch(`/api/super-admin/studios/${studioId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!res.ok) throw new Error("Not found");
  const data = await res.json();
  return data.data;
}

export default function StudioDetailPage({
  params,
}: {
  params: Promise<{ studioId: string }>;
}) {
  const { studioId } = use(params);
  const { token } = useSuperAdminStore();
  const qc = useQueryClient();

  const [storageInput, setStorageInput] = useState("");
  const [storageUnit, setStorageUnit] = useState<"GB" | "MB">("GB");
  const [photoLightbox, setPhotoLightbox] = useState<StudioPhoto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["studio-detail", studioId],
    queryFn: () => fetchStudio(token, studioId),
    enabled: !!token,
  });

  const patchStudio = useMutation({
    mutationFn: async (update: Record<string, unknown>) => {
      const res = await fetch(`/api/super-admin/studios/${studioId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(update),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-detail", studioId] });
    },
    onError: () => toast.error("Update failed"),
  });

  const suspendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/super-admin/studios/${studioId}/suspend`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (d) => {
      toast.success(d.data.message);
      qc.invalidateQueries({ queryKey: ["studio-detail", studioId] });
    },
    onError: () => toast.error("Action failed"),
  });

  const storageMutation = useMutation({
    mutationFn: async (bytes: number) => {
      const res = await fetch(`/api/super-admin/studios/${studioId}/storage`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ storageLimit: bytes }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Storage limit updated");
      setStorageInput("");
      qc.invalidateQueries({ queryKey: ["studio-detail", studioId] });
    },
    onError: () => toast.error("Failed to update"),
  });

  const handleSetStorage = () => {
    if (!storageInput) return;
    const bytes = parseFloat(storageInput) * (storageUnit === "GB" ? 1024 ** 3 : 1024 ** 2);
    storageMutation.mutate(bytes);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center">
        <p className="text-white/40">Studio not found</p>
        <Link
          href="/super-admin/studios"
          className="text-violet-400 text-sm mt-2 hover:underline block"
        >
          Back to Studios
        </Link>
      </div>
    );
  }

  const { studio, recentEvents, recentPhotos, recentActivity, users } = data as {
    studio: Record<string, unknown>;
    recentEvents: StudioEvent[];
    recentPhotos: StudioPhoto[];
    recentActivity: Array<{ _id: string; type: string; description: string; createdAt: string }>;
    users: StudioUser[];
  };

  const isSuspended = studio.status === "suspended";
  const faceMatchEnabled = (studio.settings as { allowFaceMatch?: boolean })?.allowFaceMatch ?? true;
  const publicGalleryEnabled = (studio.settings as { allowPublicGallery?: boolean })?.allowPublicGallery ?? true;

  return (
    <div className="p-6 space-y-6">
      {/* Back */}
      <Link
        href="/super-admin/studios"
        className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        All Studios
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/20 rounded-2xl flex items-center justify-center">
            <Building2 className="w-7 h-7 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{studio.name as string}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="font-mono text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-md">
                {studio.studioId as string}
              </span>
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-md font-medium",
                  planColors[studio.plan as string] || "bg-white/5 text-white/40"
                )}
              >
                {String(studio.plan).charAt(0).toUpperCase() + String(studio.plan).slice(1)}
              </span>
              <div
                className={cn(
                  "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                  isSuspended
                    ? "bg-red-500/10 text-red-400"
                    : studio.status === "active"
                    ? "bg-green-500/10 text-green-400"
                    : "bg-blue-500/10 text-blue-400"
                )}
              >
                {isSuspended ? (
                  <XCircle className="w-3 h-3" />
                ) : (
                  <CheckCircle2 className="w-3 h-3" />
                )}
                <span className="capitalize">{studio.status as string}</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => suspendMutation.mutate()}
          disabled={suspendMutation.isPending}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-medium transition-all border",
            isSuspended
              ? "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
              : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
          )}
        >
          {suspendMutation.isPending
            ? "..."
            : isSuspended
            ? "Activate Studio"
            : "Suspend Studio"}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Photos",
            value: studio.photosCount as number,
            icon: ImageIcon,
            color: "text-violet-400",
          },
          {
            label: "Events",
            value: studio.eventsCount as number,
            icon: Camera,
            color: "text-pink-400",
          },
          {
            label: "Users",
            value: users?.length ?? studio.usersCount,
            icon: Users,
            color: "text-blue-400",
          },
          {
            label: "Storage Used",
            value: formatBytes(studio.storageUsed as number),
            icon: HardDrive,
            color: "text-amber-400",
          },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-4"
          >
            <item.icon className={cn("w-5 h-5 mb-2", item.color)} />
            <p className="text-xl font-bold text-white">{item.value}</p>
            <p className="text-xs text-white/40">{item.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Storage Management */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-amber-400" />
            Storage Management
          </h2>

          <StorageBar
            used={studio.storageUsed as number}
            limit={studio.storageLimit as number}
            height="lg"
          />

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-white/30 mb-1">Used</p>
              <p className="font-semibold text-white">{formatBytes(studio.storageUsed as number)}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-white/30 mb-1">Limit</p>
              <p className="font-semibold text-white">
                {formatBytes(studio.storageLimit as number)}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs text-white/40 mb-2">Set New Limit</p>
            <div className="flex gap-2 mb-2">
              <input
                type="number"
                min={1}
                placeholder="Amount"
                value={storageInput}
                onChange={(e) => setStorageInput(e.target.value)}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50"
              />
              <select
                value={storageUnit}
                onChange={(e) => setStorageUnit(e.target.value as "GB" | "MB")}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none [&_option]:bg-slate-900"
              >
                <option value="GB">GB</option>
                <option value="MB">MB</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-1 mb-3">
              {[10, 25, 50, 100, 200, 500].map((gb) => (
                <button
                  key={gb}
                  onClick={() => { setStorageInput(String(gb)); setStorageUnit("GB"); }}
                  className="py-1 text-xs bg-white/5 hover:bg-violet-500/10 text-white/50 hover:text-violet-400 rounded-lg border border-white/10 hover:border-violet-500/30 transition-all"
                >
                  {gb}GB
                </button>
              ))}
            </div>
            <button
              onClick={handleSetStorage}
              disabled={!storageInput || storageMutation.isPending}
              className="w-full py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-all hover:from-violet-500 hover:to-purple-500"
            >
              {storageMutation.isPending ? "Saving..." : "Apply Storage Limit"}
            </button>
          </div>
        </div>

        {/* Studio Info + Settings */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">Studio Information</h2>
          <div className="space-y-3">
            {[
              { icon: Shield, label: "Owner", value: studio.ownerName as string },
              { icon: Mail, label: "Email", value: studio.ownerEmail as string },
              ...(studio.phone
                ? [{ icon: Phone, label: "Phone", value: studio.phone as string }]
                : []),
              {
                icon: Activity,
                label: "Created",
                value: formatDate(studio.createdAt as string),
              },
              {
                icon: Activity,
                label: "Last Active",
                value: studio.lastActivity
                  ? formatRelativeTime(studio.lastActivity as string)
                  : "N/A",
              },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <item.icon className="w-4 h-4 text-white/30 shrink-0" />
                <span className="text-white/40 w-20 shrink-0">{item.label}</span>
                <span className="text-white/80 truncate">{item.value}</span>
              </div>
            ))}
          </div>

          {/* Feature Toggles */}
          <div className="border-t border-white/10 pt-4 space-y-2">
            <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-3">
              Features
            </p>
            {[
              {
                label: "AI Face Matching",
                key: "allowFaceMatch",
                value: faceMatchEnabled,
                icon: Zap,
                color: "text-violet-400",
              },
              {
                label: "Public Gallery",
                key: "allowPublicGallery",
                value: publicGalleryEnabled,
                icon: Eye,
                color: "text-blue-400",
              },
            ].map(({ label, key, value, icon: Icon, color }) => (
              <div
                key={key}
                className="flex items-center justify-between p-2.5 bg-white/5 border border-white/10 rounded-xl"
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn("w-4 h-4", color)} />
                  <span className="text-sm text-white/80">{label}</span>
                </div>
                <button
                  onClick={() =>
                    patchStudio.mutate({
                      settings: {
                        allowFaceMatch: key === "allowFaceMatch" ? !value : faceMatchEnabled,
                        allowPublicGallery:
                          key === "allowPublicGallery" ? !value : publicGalleryEnabled,
                      },
                    })
                  }
                  disabled={patchStudio.isPending}
                  className={cn(
                    "relative w-10 h-5 rounded-full transition-colors",
                    value ? "bg-violet-600" : "bg-white/10"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                      value ? "translate-x-5" : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-400" />
            Activity Log
          </h2>
          <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin pr-1">
            {(recentActivity || []).length === 0 ? (
              <p className="text-xs text-white/30 text-center py-6">No activity yet</p>
            ) : (
              recentActivity.map((a) => (
                <div
                  key={a._id}
                  className="p-2.5 bg-white/5 rounded-xl border border-white/10"
                >
                  <p className={cn("text-xs font-medium", activityColors[a.type] || "text-white/60")}>
                    {a.type.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-white/50 mt-0.5">{a.description}</p>
                  <p className="text-[10px] text-white/25 mt-1">{formatRelativeTime(a.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Team / Users ─────────────────────────────────────────────── */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-400" />
          Team ({users?.length ?? 0} members)
        </h2>
        {!users || users.length === 0 ? (
          <p className="text-xs text-white/30 text-center py-6">No users yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {users.map((u) => (
              <div
                key={u._id}
                className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl"
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0",
                    u.role === "admin"
                      ? "bg-violet-500/20 text-violet-300"
                      : "bg-pink-500/20 text-pink-300"
                  )}
                >
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm text-white truncate">{u.name}</p>
                    {!u.isActive && (
                      <span className="text-[10px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/40 truncate">{u.email}</p>
                  <p className="text-[10px] text-white/25 capitalize">{u.role}</p>
                </div>
                <div className="shrink-0">
                  {u.isActive ? (
                    <UserCheck className="w-4 h-4 text-green-400" />
                  ) : (
                    <UserX className="w-4 h-4 text-red-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Recent Events ─────────────────────────────────────────────── */}
      {recentEvents?.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Camera className="w-4 h-4 text-pink-400" />
            Recent Events ({recentEvents.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentEvents.map((ev) => (
              <div
                key={ev._id}
                className="bg-white/5 border border-white/10 rounded-xl p-3 hover:border-white/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-white truncate">{ev.title}</p>
                  {ev.slug && (
                    <Link
                      href={`/event/${ev.slug}`}
                      target="_blank"
                      className="shrink-0 text-white/30 hover:text-violet-400 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-white/40">
                  <span
                    className={cn(
                      "capitalize px-1.5 py-0.5 rounded-full text-[10px]",
                      ev.status === "live"
                        ? "bg-green-500/20 text-green-400"
                        : ev.status === "completed"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-white/10 text-white/40"
                    )}
                  >
                    {ev.status}
                  </span>
                  <span>{ev.photosCount} photos</span>
                  <span>{formatBytes(ev.storageUsed)}</span>
                </div>
                <p className="text-[10px] text-white/25 mt-1">
                  {formatDate(ev.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Photos Grid ───────────────────────────────────────────────── */}
      {recentPhotos?.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-violet-400" />
            Recent Photos ({recentPhotos.length} shown)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {recentPhotos.map((photo) => (
              <motion.button
                key={photo._id}
                whileHover={{ scale: 1.03 }}
                onClick={() => setPhotoLightbox(photo)}
                className="relative aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-violet-500/40 transition-colors"
              >
                <Image
                  src={photo.thumbnailUrl || photo.cdnUrl}
                  alt={photo.originalName || photo.filename}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 16vw"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none'%3E%3Crect width='24' height='24' fill='%23ffffff10'/%3E%3C/svg%3E";
                  }}
                />
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {photoLightbox && (
          <div
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setPhotoLightbox(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl max-h-[85vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPhotoLightbox(null)}
                className="absolute -top-4 -right-4 z-10 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
              >
                ×
              </button>
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/50">
                <Image
                  src={photoLightbox.cdnUrl}
                  alt={photoLightbox.originalName || photoLightbox.filename}
                  fill
                  className="object-contain"
                  sizes="100vw"
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-white/40 px-1">
                <span>{photoLightbox.originalName || photoLightbox.filename}</span>
                <span>{formatBytes(photoLightbox.size)}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
