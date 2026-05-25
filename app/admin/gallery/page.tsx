"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Grid,
  Image as ImageIcon,
  LayoutGrid,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";

// ─── helpers ────────────────────────────────────────────────────────────────
function getToken() {
  return document.cookie.match(/auth-token=([^;]+)/)?.[1] || "";
}

function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── types ───────────────────────────────────────────────────────────────────
interface ApiPhoto {
  _id: string;
  cdnUrl: string;
  thumbnailUrl?: string;
  eventId: string;
  eventTitle: string;
  size: number;
  originalName: string;
  createdAt: string;
}

// ─── animation variants ──────────────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 20 },
  },
  exit: { opacity: 0, scale: 0.92, transition: { duration: 0.18 } },
};

const lightboxVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

const lightboxImgVariants = {
  hidden: { opacity: 0, scale: 0.88 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 320, damping: 28 },
  },
  exit: { opacity: 0, scale: 0.92, transition: { duration: 0.15 } },
};

// ─── component ───────────────────────────────────────────────────────────────
export default function GalleryPage() {
  const [photos, setPhotos] = useState<ApiPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"masonry" | "grid">("masonry");
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Watermark
  const [wmEnabled, setWmEnabled] = useState(false);
  const [wmUrl, setWmUrl] = useState<string | undefined>();

  const LIMIT = 200;

  // ── fetch watermark settings ─────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/studio/settings", {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setWmEnabled(!!d.data?.settings?.watermarkEnabled);
          setWmUrl(d.data?.settings?.watermark || d.data?.logo);
        }
      })
      .catch(() => {/* silently ignore watermark fetch errors */});
  }, []);

  // ── fetch photos ─────────────────────────────────────────────────────────
  const fetchPhotos = useCallback(
    async (pg: number, replace = false) => {
      pg === 1 ? setLoading(true) : setLoadingMore(true);
      try {
        const res = await fetch(
          `/api/photos?page=${pg}&limit=${LIMIT}`,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        const raw: ApiPhoto[] = data.data.photos ?? [];
        const shuffled = fisherYates(raw);

        setPhotos((prev) => (replace ? shuffled : [...prev, ...shuffled]));
        setHasMore(data.data.pagination.page < data.data.pagination.pages);
        setPage(pg);
      } catch {
        toast.error("Failed to load photos");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchPhotos(1, true);
  }, [fetchPhotos]);

  // ── derived state ────────────────────────────────────────────────────────
  const eventOptions = Array.from(
    new Set(photos.map((p) => p.eventTitle).filter(Boolean))
  ).sort();

  const filtered = photos.filter((p) => {
    if (selectedEvent !== "all" && p.eventTitle !== selectedEvent) return false;
    if (
      search &&
      !p.eventTitle?.toLowerCase().includes(search.toLowerCase()) &&
      !p.originalName?.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  // ── actions ──────────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearSelected = () => setSelected(new Set());

  const reshuffle = () => {
    setPhotos((prev) => fisherYates(prev));
    toast.success("Photos reshuffled!");
  };

  const openLightbox = (idx: number) => {
    setLightboxIndex(idx);
  };

  // keyboard nav
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "ArrowRight")
        setLightboxIndex((i) => Math.min((i ?? 0) + 1, filtered.length - 1));
      if (e.key === "ArrowLeft")
        setLightboxIndex((i) => Math.max((i ?? 0) - 1, 0));
      if (e.key === "Escape") setLightboxIndex(null);
    },
    [lightboxIndex, filtered.length]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // sentinel ref for infinite scroll
  const sentinel = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!sentinel.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          fetchPhotos(page + 1);
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(sentinel.current);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, loading, page, fetchPhotos]);

  // ── loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col min-h-full">
        <Topbar title="Gallery" subtitle="Loading…" />
        <div className="p-6">
          <div className="flex gap-4">
            {[0, 1, 2, 3].map((col) => (
              <div key={col} className="flex-1 space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="rounded-2xl bg-muted/60"
                    style={{ height: [180, 240, 200, 160][i % 4] }}
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.6, delay: (col * 4 + i) * 0.07 }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── empty state ──────────────────────────────────────────────────────────
  if (!loading && photos.length === 0) {
    return (
      <div className="flex flex-col min-h-full">
        <Topbar title="Gallery" subtitle="0 photos" />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <ImageIcon className="w-16 h-16 opacity-30" />
          </motion.div>
          <p className="text-sm">No photos uploaded yet. Create an event and start uploading!</p>
        </div>
      </div>
    );
  }

  // ── main render ──────────────────────────────────────────────────────────
  const COLS = 4;

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Gallery" subtitle={`${filtered.length} of ${photos.length} photos`} />

      <div className="p-6 space-y-5">
        {/* ── Toolbar ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-wrap gap-3 items-center justify-between"
        >
          <div className="flex gap-3 flex-wrap items-center">
            <div className="w-56">
              <Input
                placeholder="Search photos or events…"
                icon={<Search className="w-4 h-4" />}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelected(new Set());
                }}
                className="h-9"
              />
            </div>

            <Select
              value={selectedEvent}
              onValueChange={(v) => {
                setSelectedEvent(v);
                setSelected(new Set());
              }}
            >
              <SelectTrigger className="w-52 h-9">
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {eventOptions.map((ev) => (
                  <SelectItem key={ev} value={ev}>
                    {ev}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2"
              onClick={reshuffle}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Shuffle
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className="flex items-center gap-2"
              >
                <Badge variant="blue" className="text-xs">
                  {selected.size} selected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={clearSelected}
                >
                  Clear
                </Button>
              </motion.div>
            )}

            {/* View mode toggle */}
            <div className="flex rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setViewMode("masonry")}
                className={`px-3 py-1.5 transition-colors ${
                  viewMode === "masonry"
                    ? "bg-primary text-white"
                    : "hover:bg-muted"
                }`}
                title="Masonry view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 transition-colors ${
                  viewMode === "grid"
                    ? "bg-primary text-white"
                    : "hover:bg-muted"
                }`}
                title="Grid view"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Gallery ─────────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {viewMode === "masonry" ? (
            <motion.div
              key="masonry"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0 }}
              className="flex gap-4"
            >
              {Array.from({ length: COLS }, (_, col) => (
                <div key={col} className="flex-1 space-y-4">
                  {filtered
                    .filter((_, i) => i % COLS === col)
                    .map((photo, idx) => {
                      const globalIdx = filtered.findIndex(
                        (p) => p._id === photo._id
                      );
                      const aspectRatio =
                        idx % 3 === 0 ? "4/5" : idx % 3 === 1 ? "4/3" : "1/1";
                      return (
                        <MasonryCard
                          key={photo._id}
                          photo={photo}
                          aspectRatio={aspectRatio}
                          isSelected={selected.has(photo._id)}
                          wmEnabled={wmEnabled}
                          wmUrl={wmUrl}
                          onOpen={() => openLightbox(globalIdx)}
                          onToggleSelect={() => toggleSelect(photo._id)}
                        />
                      );
                    })}
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0 }}
              className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3"
            >
              {filtered.map((photo, i) => (
                <GridCard
                  key={photo._id}
                  photo={photo}
                  isSelected={selected.has(photo._id)}
                  wmEnabled={wmEnabled}
                  wmUrl={wmUrl}
                  onOpen={() => openLightbox(i)}
                  onToggleSelect={() => toggleSelect(photo._id)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Load more sentinel ──────────────────────────────────────────── */}
        <div ref={sentinel} className="h-8 flex items-center justify-center">
          {loadingMore && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            >
              <RefreshCw className="w-5 h-5 text-muted-foreground" />
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightboxIndex !== null && filtered[lightboxIndex] && (
          <motion.div
            variants={lightboxVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 bg-black/96 flex items-center justify-center"
            onClick={() => setLightboxIndex(null)}
          >
            {/* Close */}
            <button
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(null);
              }}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Prev */}
            {lightboxIndex > 0 && (
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((i) => Math.max((i ?? 1) - 1, 0));
                }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Next */}
            {lightboxIndex < filtered.length - 1 && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((i) => Math.min((i ?? 0) + 1, filtered.length - 1));
                }}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Image */}
            <div
              className="relative"
              onClick={(e) => e.stopPropagation()}
            >
              <AnimatePresence mode="wait">
                <motion.img
                  key={lightboxIndex}
                  variants={lightboxImgVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  src={filtered[lightboxIndex].cdnUrl}
                  alt={filtered[lightboxIndex].originalName}
                  className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl"
                />
              </AnimatePresence>

              {/* Watermark in lightbox */}
              {wmEnabled && wmUrl && (
                <div className="absolute bottom-4 right-4 pointer-events-none z-10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={wmUrl}
                    alt="watermark"
                    className="h-10 max-w-[140px] object-contain opacity-60 drop-shadow-lg"
                  />
                </div>
              )}
            </div>

            {/* Caption */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
              <p className="text-white/70 text-sm font-medium">
                {filtered[lightboxIndex].eventTitle}
              </p>
              <p className="text-white/40 text-xs">
                {lightboxIndex + 1} / {filtered.length}
              </p>
            </div>

            {/* Download button */}
            <a
              href={filtered[lightboxIndex].cdnUrl}
              download={filtered[lightboxIndex].originalName}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-4 right-16 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="w-5 h-5" />
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── MasonryCard ────────────────────────────────────────────────────────────
function MasonryCard({
  photo,
  aspectRatio,
  isSelected,
  wmEnabled,
  wmUrl,
  onOpen,
  onToggleSelect,
}: {
  photo: ApiPhoto;
  aspectRatio: string;
  isSelected: boolean;
  wmEnabled: boolean;
  wmUrl?: string;
  onOpen: () => void;
  onToggleSelect: () => void;
}) {
  return (
    <motion.div
      variants={cardVariants}
      className={`relative group overflow-hidden rounded-2xl cursor-pointer ${
        isSelected ? "ring-2 ring-primary ring-offset-2" : ""
      }`}
      onClick={onOpen}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.thumbnailUrl || photo.cdnUrl}
        alt={photo.originalName}
        className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
        style={{ aspectRatio }}
        loading="lazy"
      />

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      {/* Select checkbox */}
      <div
        className={`absolute top-3 left-3 w-5 h-5 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
          isSelected
            ? "bg-primary border-primary scale-110"
            : "border-white/70 bg-black/20 opacity-0 group-hover:opacity-100"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect();
        }}
      >
        {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
      </div>

      {/* Event tag */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <span className="px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium truncate max-w-[100px]">
          {photo.eventTitle}
        </span>
      </div>

      {/* Watermark */}
      {wmEnabled && wmUrl && (
        <div className="absolute bottom-2 right-2 pointer-events-none z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={wmUrl}
            alt="watermark"
            className="h-6 max-w-[80px] object-contain opacity-65 drop-shadow-md"
          />
        </div>
      )}
    </motion.div>
  );
}

// ─── GridCard ────────────────────────────────────────────────────────────────
function GridCard({
  photo,
  isSelected,
  wmEnabled,
  wmUrl,
  onOpen,
  onToggleSelect,
}: {
  photo: ApiPhoto;
  isSelected: boolean;
  wmEnabled: boolean;
  wmUrl?: string;
  onOpen: () => void;
  onToggleSelect: () => void;
}) {
  return (
    <motion.div
      variants={cardVariants}
      className={`aspect-square rounded-xl overflow-hidden cursor-pointer relative group ${
        isSelected ? "ring-2 ring-primary ring-offset-1" : ""
      }`}
      onClick={onOpen}
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.thumbnailUrl || photo.cdnUrl}
        alt={photo.originalName}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Select checkbox */}
      <button
        className={`absolute top-1.5 left-1.5 w-4 h-4 rounded-full border transition-all flex items-center justify-center ${
          isSelected
            ? "bg-primary border-primary"
            : "border-white/70 opacity-0 group-hover:opacity-100"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect();
        }}
      >
        {isSelected && <span className="text-white text-[8px] font-bold">✓</span>}
      </button>

      {/* Watermark */}
      {wmEnabled && wmUrl && (
        <div className="absolute bottom-1 right-1 pointer-events-none z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={wmUrl}
            alt="watermark"
            className="h-4 max-w-[50px] object-contain opacity-65 drop-shadow-sm"
          />
        </div>
      )}
    </motion.div>
  );
}
