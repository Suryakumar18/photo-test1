"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Download,
  Heart, Loader2, Search, Share2, X, ImageOff,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";

// ─── types ────────────────────────────────────────────────────────────────────

interface GalleryPhoto {
  _id: string;
  cdnUrl: string;
  thumbnailUrl?: string;
  originalName?: string;
}

interface EventData {
  _id: string;
  title: string;
  slug: string;
  brideName?: string;
  groomName?: string;
  photosCount: number;
  watermark?: { enabled: boolean; url?: string };
}

// ─── fetchers ─────────────────────────────────────────────────────────────────

async function fetchEvent(slug: string) {
  const res = await fetch(`/api/events/${slug}/public`);
  if (!res.ok) throw new Error("Event not found");
  return (await res.json()).data;
}

async function fetchPhotos(eventId: string): Promise<GalleryPhoto[]> {
  const res = await fetch(`/api/photos?eventId=${eventId}&limit=200`);
  if (!res.ok) throw new Error("Failed to load photos");
  return (await res.json()).data.photos ?? [];
}

// ─── Gallery Page ─────────────────────────────────────────────────────────────

export default function EventGalleryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [liked, setLiked] = useState<Set<string>>(new Set());

  const { data: event } = useQuery<EventData>({
    queryKey: ["event-public", slug],
    queryFn: () => fetchEvent(slug),
    retry: false,
  });

  // Watermark info from the event (populated by the public API via studio settings)
  const wmEnabled = event?.watermark?.enabled ?? false;
  const wmUrl     = event?.watermark?.url;

  const prevCountRef = useRef<number>(0);

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["gallery-photos", event?._id],
    queryFn: () => fetchPhotos(event!._id),
    enabled: !!event?._id,
    // Poll every 15 s so new uploads appear automatically
    refetchInterval: 15 * 1000,
    // Also refetch when the user switches back to this tab
    refetchOnWindowFocus: true,
  });

  // Toast when new photos arrive after initial load
  useEffect(() => {
    if (photos.length === 0) return;
    if (prevCountRef.current > 0 && photos.length > prevCountRef.current) {
      const added = photos.length - prevCountRef.current;
      toast.success(`${added} new photo${added > 1 ? "s" : ""} added!`);
    }
    prevCountRef.current = photos.length;
  }, [photos.length]);

  const filtered = search
    ? photos.filter((p) =>
        (p.originalName ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : photos;

  const toggleLike = (id: string) =>
    setLiked((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  const handleDownload = (url: string, name: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = name || "photo.jpg";
    link.target = "_blank";
    link.click();
    toast.success("Download started!");
  };

  const handleShare = async (url: string) => {
    if (navigator.share) {
      await navigator.share({ url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "ArrowRight") setLightboxIndex((i) => Math.min((i ?? 0) + 1, filtered.length - 1));
      if (e.key === "ArrowLeft")  setLightboxIndex((i) => Math.max((i ?? 0) - 1, 0));
      if (e.key === "Escape")     setLightboxIndex(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, filtered.length]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 h-14 flex items-center gap-4">
          <Link href={`/event/${slug}`}>
            <Button variant="ghost" size="icon-sm" className="rounded-full">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="font-semibold text-sm flex-1 truncate">
            {event?.title ?? "Event Gallery"}
          </h1>
          <Badge variant="rose" className="text-xs shrink-0">{photos.length} photos</Badge>
          <div className="hidden sm:block w-48">
            <Input
              placeholder="Search..."
              icon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {isLoading ? (
          /* Loading skeleton */
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="break-inside-avoid rounded-2xl bg-muted animate-pulse"
                style={{ height: `${200 + (i % 4) * 60}px` }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mb-5">
              <ImageOff className="w-9 h-9 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold mb-2">
              {search ? "No matching photos" : "No photos yet"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {search
                ? "Try a different search term."
                : "The photographer hasn't uploaded photos for this event yet. Check back soon!"}
            </p>
          </div>
        ) : (
          /* Masonry grid */
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {filtered.map((photo, i) => (
              <motion.div
                key={photo._id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.025, 0.5) }}
                className="break-inside-avoid relative group overflow-hidden rounded-2xl cursor-pointer bg-muted"
                onClick={() => setLightboxIndex(i)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.thumbnailUrl || photo.cdnUrl}
                  alt={photo.originalName ?? ""}
                  className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                {/* Watermark overlay — bottom-right corner, always on top */}
                {wmEnabled && wmUrl && (
                  <div className="absolute bottom-2 right-2 pointer-events-none z-10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={wmUrl}
                      alt="watermark"
                      className="w-10 h-10 object-contain opacity-65 select-none drop-shadow-md"
                    />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLike(photo._id); }}
                    className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition-colors"
                  >
                    <Heart className={`w-4 h-4 ${liked.has(photo._id) ? "fill-rose-500 text-rose-500" : "text-white"}`} />
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownload(photo.cdnUrl, photo.originalName ?? `photo-${i}.jpg`); }}
                      className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-white" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleShare(photo.cdnUrl); }}
                      className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && filtered[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={() => setLightboxIndex(null)}
          >
            <button
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(null); }}
            >
              <X className="w-5 h-5" />
            </button>

            {lightboxIndex > 0 && (
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i ?? 1) - 1); }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {lightboxIndex < filtered.length - 1 && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i ?? 0) + 1); }}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            <motion.div
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-5xl max-h-[90vh] px-16"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={filtered[lightboxIndex].cdnUrl}
                alt=""
                className="max-w-full max-h-[80vh] object-contain rounded-xl"
              />
              {/* Watermark in lightbox — bottom-right corner */}
              {wmEnabled && wmUrl && (
                <div className="absolute bottom-4 right-4 pointer-events-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={wmUrl}
                    alt="watermark"
                    className="w-14 h-14 object-contain opacity-65 select-none drop-shadow-lg"
                  />
                </div>
              )}
            </motion.div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); toggleLike(filtered[lightboxIndex]._id); }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm backdrop-blur-sm transition-colors"
              >
                <Heart className={`w-4 h-4 ${liked.has(filtered[lightboxIndex]._id) ? "fill-rose-500 text-rose-500" : ""}`} />
                Like
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDownload(filtered[lightboxIndex].cdnUrl, filtered[lightboxIndex].originalName ?? "photo.jpg"); }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm backdrop-blur-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleShare(filtered[lightboxIndex].cdnUrl); }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm backdrop-blur-sm transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>

            <p className="absolute top-4 left-1/2 -translate-x-1/2 text-white/50 text-sm">
              {lightboxIndex + 1} / {filtered.length}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
