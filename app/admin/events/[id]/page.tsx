"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft, Calendar, Camera, Check, Copy, Download, Eye,
  Image, Loader2, MapPin, QrCode, Share2, Trash2, Upload,
  Users, X, ZoomIn, Plus, CloudUpload, AlertTriangle,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { Topbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatBytes } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── helpers ─────────────────────────────────────────────────────────────────

function getToken() {
  return document.cookie.match(/auth-token=([^;]+)/)?.[1] || "";
}

const statusConfig = {
  upcoming: { label: "Upcoming", variant: "blue" as const },
  live:     { label: "Live",     variant: "green" as const },
  completed:{ label: "Completed",variant: "gold" as const  },
  archived: { label: "Archived", variant: "outline" as const },
};

// ─── API fetchers ─────────────────────────────────────────────────────────────

async function fetchEvent(id: string) {
  const res = await fetch(`/api/events/${id}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Failed to fetch event");
  return (await res.json()).data;
}

async function fetchPhotos(eventId: string, page = 1) {
  const res = await fetch(`/api/photos?eventId=${eventId}&page=${page}&limit=60`);
  if (!res.ok) throw new Error("Failed to fetch photos");
  return (await res.json()).data;
}

// ─── Upload state types ───────────────────────────────────────────────────────

interface UploadItem {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  cdnUrl?: string;
  error?: string;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // ── Watermark settings ────────────────────────────────────────────────────
  const [wmEnabled, setWmEnabled] = useState(false);
  const [wmUrl, setWmUrl] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch("/api/studio/settings", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          const s = json.data.settings ?? {};
          setWmEnabled(!!s.watermarkEnabled);
          // Use the watermark image URL, falling back to the studio logo
          setWmUrl(s.watermark || json.data.logo || null);
        }
      })
      .catch(() => {});
  }, []);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: () => fetchEvent(id),
    retry: false,
  });

  const { data: photosData, isLoading: photosLoading } = useQuery({
    queryKey: ["photos", id],
    queryFn: () => fetchPhotos(id),
    enabled: !!id,
  });

  const photos: Array<{
    _id: string; cdnUrl: string; originalName: string; size: number; createdAt: string;
  }> = photosData?.photos ?? [];

  // ── Status mutation ────────────────────────────────────────────────────────

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Status updated!");
    },
    onError: () => toast.error("Failed to update status"),
  });

  // ── Delete photo mutation ─────────────────────────────────────────────────

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      const res = await fetch(`/api/photos/${photoId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photos", id] });
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      setDeleteConfirm(null);
      toast.success("Photo deleted");
    },
    onError: () => toast.error("Failed to delete photo"),
  });

  // ── Upload logic ──────────────────────────────────────────────────────────

  const addFiles = useCallback((files: FileList | File[]) => {
    const newItems: UploadItem[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"))
      .map((file) => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
        status: "pending" as const,
        progress: 0,
      }));
    if (!newItems.length) { toast.error("Only images and videos allowed"); return; }
    setUploads((prev) => [...prev, ...newItems]);
    setShowUploadPanel(true);
  }, []);

  const uploadFile = useCallback(async (item: UploadItem) => {
    setUploads((prev) =>
      prev.map((u) => (u.id === item.id ? { ...u, status: "uploading", progress: 10 } : u))
    );

    try {
      const formData = new FormData();
      formData.append("file", item.file);
      formData.append("eventId", id);

      // Fake progress ticks while uploading
      const ticker = setInterval(() => {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === item.id && u.progress < 80
              ? { ...u, progress: u.progress + 10 }
              : u
          )
        );
      }, 300);

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });

      clearInterval(ticker);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");

      setUploads((prev) =>
        prev.map((u) =>
          u.id === item.id
            ? { ...u, status: "done", progress: 100, cdnUrl: data.data?.cdnUrl }
            : u
        )
      );

      queryClient.invalidateQueries({ queryKey: ["photos", id] });
      queryClient.invalidateQueries({ queryKey: ["event", id] });
    } catch (err) {
      setUploads((prev) =>
        prev.map((u) =>
          u.id === item.id
            ? { ...u, status: "error", error: err instanceof Error ? err.message : "Upload failed" }
            : u
        )
      );
    }
  }, [id, queryClient]);

  // Auto-upload pending items
  useEffect(() => {
    const pending = uploads.filter((u) => u.status === "pending");
    pending.forEach((item) => uploadFile(item));
  }, [uploads, uploadFile]);

  const removeUpload = (uploadId: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== uploadId));
  };

  const clearDoneUploads = () => {
    setUploads((prev) => prev.filter((u) => u.status !== "done"));
  };

  // ── Drag and drop ──────────────────────────────────────────────────────────

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  // ── Misc helpers ──────────────────────────────────────────────────────────

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied!");
  };

  const downloadQR = (qrCode: string, title: string) => {
    const link = document.createElement("a");
    link.href = qrCode;
    link.download = `${title}-qr.png`;
    link.click();
    toast.success("QR code downloaded!");
  };

  // ─────────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-full">
        <Topbar title="Event Details" />
        <div className="p-6 space-y-6 max-w-6xl">
          <div className="h-64 rounded-2xl bg-muted animate-pulse" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map((i) => <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  const ev = event ?? {
    _id: id, title: "Wedding Event", slug: `event-${id}`,
    brideName: "Bride", groomName: "Groom",
    eventDate: new Date(), location: "Venue",
    coverImageCDN: null, qrCode: null,
    shareUrl: `http://localhost:3000/event/event-${id}`,
    status: "upcoming", photosCount: 0, videosCount: 0,
    viewsCount: 0, faceMatchCount: 0, storageUsed: 0,
    photographers: [], isPublic: true, createdAt: new Date(),
  };

  const statusCfg = statusConfig[ev.status as keyof typeof statusConfig] ?? statusConfig.upcoming;
  const doneCount  = uploads.filter((u) => u.status === "done").length;
  const busyCount  = uploads.filter((u) => u.status === "uploading" || u.status === "pending").length;

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Event Details" subtitle={ev.title} />

      <div className="p-6 space-y-6 max-w-6xl">

        {/* Back + actions */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link href="/admin/events">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="w-4 h-4" /> All Events
            </Button>
          </Link>
          <div className="flex gap-2 flex-wrap">
            <Link href={`/event/${ev.slug}`} target="_blank">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Guest View
              </Button>
            </Link>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setShowUploadPanel(true);
                fileInputRef.current?.click();
              }}
            >
              <CloudUpload className="w-3.5 h-3.5" />
              Upload Photos
              {busyCount > 0 && (
                <span className="ml-1 bg-white/20 text-xs rounded-full px-1.5">{busyCount}</span>
              )}
            </Button>
          </div>
        </div>

        {/* Hero cover */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl overflow-hidden h-56 md:h-72"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {ev.coverImageCDN ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ev.coverImageCDN} alt={ev.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-rose-500/20 to-pink-600/20 flex items-center justify-center">
              <Camera className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Drag overlay */}
          <AnimatePresence>
            {isDragging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-primary/30 backdrop-blur-sm border-4 border-dashed border-primary/60 rounded-3xl flex flex-col items-center justify-center z-20"
              >
                <CloudUpload className="w-16 h-16 text-white mb-3" />
                <p className="text-white text-xl font-bold">Drop photos here</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute bottom-0 left-0 right-0 p-6 text-white flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold mb-1">{ev.title}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-white/70">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" /> {formatDate(ev.eventDate)}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> {ev.location}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
              <Select
                value={ev.status}
                onValueChange={(val) => statusMutation.mutate(val)}
                disabled={statusMutation.isPending}
              >
                <SelectTrigger className="w-32 h-8 text-xs bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Image,  label: "Photos",       value: (ev.photosCount ?? 0) + doneCount, color: "bg-rose-500/10 text-rose-500" },
            { icon: Camera, label: "Videos",        value: ev.videosCount ?? 0,    color: "bg-violet-500/10 text-violet-500" },
            { icon: Eye,    label: "Visitors",      value: ev.viewsCount ?? 0,     color: "bg-blue-500/10 text-blue-500" },
            { icon: Users,  label: "Face Matches",  value: ev.faceMatchCount ?? 0, color: "bg-green-500/10 text-green-500" },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className="border border-border/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center shrink-0`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{stat.value.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left: QR + Details ─────────────────────────────────────── */}
          <div className="space-y-4">
            <Card className="border border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-primary" />
                  QR Code & Share Link
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ev.qrCode ? (
                  <div className="bg-white p-4 rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ev.qrCode} alt="QR Code" className="w-36 h-36 mx-auto" />
                  </div>
                ) : (
                  <div className="bg-muted rounded-xl p-8 text-center">
                    <QrCode className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">QR code generated on creation</p>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
                  <span className="text-xs text-muted-foreground flex-1 truncate">{ev.shareUrl}</span>
                  <button onClick={() => copyLink(ev.shareUrl)} className="shrink-0 p-1 hover:text-primary transition-colors">
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex gap-2">
                  {ev.qrCode && (
                    <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => downloadQR(ev.qrCode, ev.title)}>
                      <Download className="w-3.5 h-3.5" /> QR PNG
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => copyLink(ev.shareUrl)}>
                    <Share2 className="w-3.5 h-3.5" /> Copy Link
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  { label: "Bride",    value: ev.brideName },
                  { label: "Groom",   value: ev.groomName },
                  { label: "Date",    value: formatDate(ev.eventDate) },
                  { label: "Venue",   value: ev.location },
                  { label: "Storage", value: formatBytes(ev.storageUsed) },
                  { label: "Public",  value: ev.isPublic ? "Yes" : "No" },
                  { label: "Slug",    value: ev.slug },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">{label}</span>
                    <span className="font-medium text-right truncate max-w-[60%]">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* ── Right: Photos + Upload ─────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Upload Panel */}
            <AnimatePresence>
              {showUploadPanel && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <Card className="border-2 border-primary/20 bg-primary/5">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <CloudUpload className="w-4 h-4 text-primary" />
                          Upload Photos
                          {busyCount > 0 && (
                            <span className="text-xs text-muted-foreground">· {busyCount} uploading...</span>
                          )}
                          {busyCount === 0 && doneCount > 0 && (
                            <span className="text-xs text-green-500">· {doneCount} done</span>
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {doneCount > 0 && (
                            <button onClick={clearDoneUploads} className="text-xs text-muted-foreground hover:text-foreground">
                              Clear done
                            </button>
                          )}
                          <button onClick={() => setShowUploadPanel(false)} className="p-1 hover:bg-muted rounded-lg transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Drop zone */}
                      <div
                        ref={dropZoneRef}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                          isDragging
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                      >
                        <CloudUpload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="font-medium text-sm mb-1">Drag & drop photos here</p>
                        <p className="text-xs text-muted-foreground">or click to browse · JPG, PNG, WEBP, HEIC, MP4 · Max 50MB</p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*,video/mp4,video/quicktime"
                          className="hidden"
                          onChange={(e) => e.target.files && addFiles(e.target.files)}
                        />
                      </div>

                      {/* Upload queue */}
                      {uploads.length > 0 && (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {uploads.map((u) => (
                            <div key={u.id} className="flex items-center gap-3 bg-background rounded-xl p-2.5">
                              {/* Thumb */}
                              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={u.preview} alt="" className="w-full h-full object-cover" />
                              </div>
                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{u.file.name}</p>
                                <p className="text-xs text-muted-foreground">{formatBytes(u.file.size)}</p>
                                {(u.status === "uploading" || u.status === "pending") && (
                                  <div className="h-1 bg-muted rounded-full mt-1.5 overflow-hidden">
                                    <motion.div
                                      className="h-full bg-primary rounded-full"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${u.progress}%` }}
                                      transition={{ ease: "linear" }}
                                    />
                                  </div>
                                )}
                                {u.status === "error" && (
                                  <p className="text-xs text-destructive mt-0.5">{u.error}</p>
                                )}
                              </div>
                              {/* Status icon */}
                              <div className="shrink-0">
                                {u.status === "done" && <Check className="w-4 h-4 text-green-500" />}
                                {u.status === "error" && (
                                  <button onClick={() => removeUpload(u.id)}>
                                    <X className="w-4 h-4 text-destructive" />
                                  </button>
                                )}
                                {(u.status === "uploading" || u.status === "pending") && (
                                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Photos Grid */}
            <Card className="border border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Image className="w-4 h-4 text-primary" />
                    Photos ({photos.length + (doneCount > 0 && !showUploadPanel ? 0 : 0)})
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Link href={`/event/${ev.slug}/gallery`} target="_blank">
                      <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
                        <Eye className="w-3 h-3" /> Guest Gallery
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 gap-1"
                      onClick={() => {
                        setShowUploadPanel(true);
                        setTimeout(() => fileInputRef.current?.click(), 100);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Photos
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {photosLoading ? (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : photos.length === 0 && uploads.filter((u) => u.status === "done").length === 0 ? (
                  /* Empty state */
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div
                      className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500/20 to-pink-600/20 flex items-center justify-center mb-4 cursor-pointer hover:from-rose-500/30 transition-all"
                      onClick={() => { setShowUploadPanel(true); fileInputRef.current?.click(); }}
                    >
                      <Upload className="w-9 h-9 text-rose-500" />
                    </div>
                    <h3 className="font-semibold mb-2">No photos yet</h3>
                    <p className="text-sm text-muted-foreground mb-5 max-w-xs">
                      Upload photos to build this event&apos;s gallery. Drag & drop anywhere on the page.
                    </p>
                    <Button
                      onClick={() => { setShowUploadPanel(true); fileInputRef.current?.click(); }}
                      className="gap-1.5"
                    >
                      <CloudUpload className="w-4 h-4" /> Upload Photos
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {/* Real photos from DB */}
                    {photos.map((photo, i) => (
                      <motion.div
                        key={photo._id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: Math.min(i * 0.02, 0.4) }}
                        className="aspect-square rounded-xl overflow-hidden relative group cursor-pointer"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.cdnUrl}
                          alt={photo.originalName}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          loading="lazy"
                        />

                        {/* ── Watermark — bottom-right corner ── */}
                        {wmEnabled && wmUrl && (
                          <div className="absolute bottom-2 right-2 pointer-events-none z-10">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={wmUrl}
                              alt=""
                              className="w-9 h-9 object-contain opacity-65 select-none drop-shadow-md"
                            />
                          </div>
                        )}

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={() => setLightboxPhoto(photo.cdnUrl)}
                            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                          >
                            <ZoomIn className="w-4 h-4 text-white" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(photo._id)}
                            className="p-2 bg-red-500/70 rounded-lg hover:bg-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-[10px] truncate">{photo.originalName}</p>
                        </div>
                      </motion.div>
                    ))}

                    {/* Just-uploaded previews (done status) */}
                    {uploads.filter((u) => u.status === "done").map((u) => (
                      <motion.div
                        key={u.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="aspect-square rounded-xl overflow-hidden relative"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={u.cdnUrl || u.preview} alt={u.file.name} className="w-full h-full object-cover" />
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      </motion.div>
                    ))}

                    {/* Uploading previews */}
                    {uploads.filter((u) => u.status === "uploading" || u.status === "pending").map((u) => (
                      <div key={u.id} className="aspect-square rounded-xl overflow-hidden relative bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={u.preview} alt="" className="w-full h-full object-cover opacity-50" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                          <div className="w-12 h-1 bg-muted-foreground/20 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-primary rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${u.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add more tile */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 hover:bg-primary/5 group"
                      onClick={() => { setShowUploadPanel(true); fileInputRef.current?.click(); }}
                    >
                      <Plus className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors mb-1" />
                      <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">Add more</span>
                    </motion.div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Danger zone */}
        <Card className="border border-destructive/20 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete this event</p>
              <p className="text-xs text-muted-foreground">
                Permanently deletes all photos, videos, and data for this event. This cannot be undone.
              </p>
            </div>
            <Button variant="destructive" size="sm" className="gap-1.5 shrink-0">
              <Trash2 className="w-3.5 h-3.5" /> Delete Event
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── Lightbox ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightboxPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxPhoto(null)}
          >
            <button
              className="absolute top-4 right-4 p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
              onClick={() => setLightboxPhoto(null)}
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <motion.div
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.85 }}
              className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxPhoto.replace("w=300", "w=1200")}
                alt=""
                className="max-h-[85vh] w-auto object-contain"
              />
              {/* Watermark — bottom-right corner of lightbox image */}
              {wmEnabled && wmUrl && (
                <div className="absolute bottom-4 right-4 pointer-events-none z-10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={wmUrl}
                    alt=""
                    className="w-16 h-16 object-contain opacity-65 select-none drop-shadow-lg"
                  />
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete confirm dialog ────────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 16 }}
              className="bg-background rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="font-bold text-lg mb-1">Delete Photo?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                This will permanently delete the photo from storage. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={deletePhotoMutation.isPending}
                  onClick={() => deletePhotoMutation.mutate(deleteConfirm)}
                >
                  {deletePhotoMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : "Delete"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
