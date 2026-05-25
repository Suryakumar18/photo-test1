"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Calendar, MapPin, QrCode, Copy, Check, Download, Share2,
  Image as ImageIcon, Eye, Users, Camera, CloudUpload, Loader2,
  Trash2, Plus, ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatBytes } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── types ────────────────────────────────────────────────────────────────────

interface EventLite {
  _id: string;
  title: string;
  slug: string;
  brideName?: string;
  groomName?: string;
  eventDate?: string | Date;
  location?: string;
  coverImageCDN?: string;
  qrCode?: string;
  shareUrl?: string;
  status: "upcoming" | "live" | "completed" | "archived";
  photosCount?: number;
  videosCount?: number;
  viewsCount?: number;
  faceMatchCount?: number;
  storageUsed?: number;
}

interface PhotoItem {
  _id: string;
  cdnUrl: string;
  originalName?: string;
  size?: number;
}

interface UploadItem {
  id: string;
  file: File;
  preview: string;
  status: "uploading" | "done" | "error";
  progress: number;
}

const statusConfig = {
  upcoming: { label: "Upcoming", variant: "blue" as const },
  live:     { label: "Live",     variant: "green" as const },
  completed:{ label: "Completed",variant: "gold" as const },
  archived: { label: "Archived", variant: "outline" as const },
};

function getToken() {
  return document.cookie.match(/auth-token=([^;]+)/)?.[1] || "";
}

// ─── component ────────────────────────────────────────────────────────────────

export function EventDetailModal({
  event,
  open,
  onClose,
}: {
  event: EventLite | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const eventId = event?._id ?? "";

  const { data: photosData, isLoading: photosLoading } = useQuery({
    queryKey: ["photos", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/photos?eventId=${eventId}&limit=100`);
      if (!res.ok) throw new Error("failed");
      return (await res.json()).data;
    },
    enabled: open && !!eventId,
  });

  const photos: PhotoItem[] = photosData?.photos ?? [];

  // ── delete photo ────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (photoId: string) => {
      const res = await fetch(`/api/photos/${photoId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photos", eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Photo deleted");
    },
    onError: () => toast.error("Failed to delete photo"),
  });

  // ── upload ──────────────────────────────────────────────────────────────────
  const uploadFile = useCallback(async (item: UploadItem) => {
    try {
      const ticker = setInterval(() => {
        setUploads((prev) =>
          prev.map((u) => (u.id === item.id && u.progress < 85 ? { ...u, progress: u.progress + 12 } : u))
        );
      }, 280);

      const formData = new FormData();
      formData.append("file", item.file);
      formData.append("eventId", eventId);

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      clearInterval(ticker);

      if (!res.ok) throw new Error("upload failed");

      setUploads((prev) =>
        prev.map((u) => (u.id === item.id ? { ...u, status: "done", progress: 100 } : u))
      );
      queryClient.invalidateQueries({ queryKey: ["photos", eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    } catch {
      setUploads((prev) =>
        prev.map((u) => (u.id === item.id ? { ...u, status: "error" } : u))
      );
      toast.error(`Failed to upload ${item.file.name}`);
    }
  }, [eventId, queryClient]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const valid = Array.from(files).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    if (!valid.length) {
      toast.error("Only images and videos are allowed");
      return;
    }
    const items: UploadItem[] = valid.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
      status: "uploading" as const,
      progress: 8,
    }));
    setUploads((prev) => [...prev, ...items]);
    items.forEach(uploadFile);
  }, [uploadFile]);

  // Clear uploads when modal closes
  useEffect(() => {
    if (!open) {
      setUploads([]);
      setIsDragging(false);
    }
  }, [open]);

  const copyLink = () => {
    if (!event?.shareUrl) return;
    navigator.clipboard.writeText(event.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied!");
  };

  const downloadQR = () => {
    if (!event?.qrCode) return;
    const a = document.createElement("a");
    a.href = event.qrCode;
    a.download = `${event.title}-qr.png`;
    a.click();
    toast.success("QR downloaded!");
  };

  if (!event) return null;

  const statusCfg = statusConfig[event.status] ?? statusConfig.upcoming;
  const doneUploads = uploads.filter((u) => u.status === "done").length;
  const stats = [
    { icon: ImageIcon, label: "Photos",  value: (event.photosCount ?? 0) + doneUploads, color: "text-rose-500 bg-rose-500/10" },
    { icon: Camera,    label: "Videos",  value: event.videosCount ?? 0,    color: "text-violet-500 bg-violet-500/10" },
    { icon: Eye,       label: "Visitors",value: event.viewsCount ?? 0,     color: "text-blue-500 bg-blue-500/10" },
    { icon: Users,     label: "Matches", value: event.faceMatchCount ?? 0, color: "text-green-500 bg-green-500/10" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            className="bg-background w-full sm:max-w-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
          >
            {/* ── Cover header ──────────────────────────────────────────── */}
            <div className="relative h-40 sm:h-48 shrink-0">
              {event.coverImageCDN ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={event.coverImageCDN} alt={event.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-rose-500/30 to-pink-600/20" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/60 rounded-xl backdrop-blur-sm transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>

              <AnimatePresence>
                {isDragging && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-primary/40 border-4 border-dashed border-white/70 flex flex-col items-center justify-center z-10"
                  >
                    <CloudUpload className="w-10 h-10 text-white mb-2" />
                    <p className="text-white font-bold">Drop photos to upload</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold truncate">{event.title}</h2>
                    <div className="flex flex-wrap gap-3 text-xs text-white/70 mt-1">
                      {event.eventDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> {formatDate(event.eventDate)}
                        </span>
                      )}
                      {event.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3.5 h-3.5 shrink-0" /> {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={statusCfg.variant} className="shrink-0">{statusCfg.label}</Badge>
                </div>
              </div>
            </div>

            {/* ── Scrollable body ───────────────────────────────────────── */}
            <div className="overflow-y-auto p-4 sm:p-5 space-y-5">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-2xl border border-border/50 p-2.5 sm:p-3 text-center">
                    <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center mx-auto mb-1.5`}>
                      <s.icon className="w-4 h-4" />
                    </div>
                    <p className="font-bold text-sm">{s.value.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* ── Resources: QR + Share ─────────────────────────────── */}
              <div className="rounded-2xl border border-border/50 p-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <QrCode className="w-4 h-4 text-primary" /> Resources
                </h3>
                <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                  {event.qrCode ? (
                    <div className="bg-white p-2.5 rounded-xl shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={event.qrCode} alt="QR" className="w-28 h-28" />
                    </div>
                  ) : (
                    <div className="w-32 h-32 bg-muted rounded-xl flex items-center justify-center shrink-0">
                      <QrCode className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 w-full space-y-2">
                    <p className="text-xs text-muted-foreground">Guest share link</p>
                    <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
                      <span className="text-xs flex-1 truncate">{event.shareUrl}</span>
                      <button onClick={copyLink} className="shrink-0 hover:text-primary transition-colors">
                        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      {event.qrCode && (
                        <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={downloadQR}>
                          <Download className="w-3.5 h-3.5" /> QR PNG
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={copyLink}>
                        <Share2 className="w-3.5 h-3.5" /> Share
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Photos + Add Images ───────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    Available Images ({photos.length})
                  </h3>
                  <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => fileInputRef.current?.click()}>
                    <Plus className="w-3.5 h-3.5" /> Add Images
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/mp4,video/quicktime"
                    className="hidden"
                    onChange={(e) => e.target.files && addFiles(e.target.files)}
                  />
                </div>

                {photosLoading ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : photos.length === 0 && uploads.length === 0 ? (
                  <div
                    className="border-2 border-dashed border-border rounded-2xl py-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 hover:bg-muted/40 transition-all"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <CloudUpload className="w-10 h-10 text-muted-foreground mb-2" />
                    <p className="font-medium text-sm">No images yet</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Click &ldquo;Add Images&rdquo; or drag &amp; drop photos here
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {/* uploaded photos */}
                    {photos.map((photo) => (
                      <div key={photo._id} className="aspect-square rounded-xl overflow-hidden relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.cdnUrl}
                          alt={photo.originalName ?? ""}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={() => setLightbox(photo.cdnUrl)}
                            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                          >
                            <ZoomIn className="w-3.5 h-3.5 text-white" />
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(photo._id)}
                            className="p-2 bg-red-500/70 rounded-lg hover:bg-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* uploading / just-uploaded */}
                    {uploads.map((u) => (
                      <div key={u.id} className="aspect-square rounded-xl overflow-hidden relative bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={u.preview}
                          alt=""
                          className={`w-full h-full object-cover ${u.status === "uploading" ? "opacity-50" : ""}`}
                        />
                        {u.status === "uploading" && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            <div className="w-12 h-1 bg-muted-foreground/20 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-primary rounded-full"
                                animate={{ width: `${u.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {u.status === "done" && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        {u.status === "error" && (
                          <div className="absolute inset-0 bg-destructive/20 flex items-center justify-center">
                            <X className="w-5 h-5 text-destructive" />
                          </div>
                        )}
                      </div>
                    ))}

                    {/* add-more tile */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center transition-all group"
                    >
                      <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-[10px] text-muted-foreground mt-0.5">Add</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Lightbox */}
          <AnimatePresence>
            {lightbox && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4"
                onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
              >
                <button className="absolute top-4 right-4 p-2 bg-white/10 rounded-xl">
                  <X className="w-5 h-5 text-white" />
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={lightbox} alt="" className="max-h-[85vh] max-w-full object-contain rounded-xl" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
