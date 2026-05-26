"use client";

import { useRef, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Calendar, Camera, Images, ImagePlus, MapPin, Scan,
  Sparkles, X, Loader2, Download, Heart, SearchX, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── types ────────────────────────────────────────────────────────────────────

interface EventData {
  _id: string;
  title: string;
  slug: string;
  brideName?: string;
  groomName?: string;
  eventDate?: string;
  location?: string;
  coverImageCDN?: string;
  photosCount?: number;
}

interface EventPhoto {
  _id: string;
  cdnUrl: string;
  thumbnailUrl?: string;
  originalName?: string;
  confidence?: number;
}

type Sensitivity = "strict" | "balanced" | "loose";
type Step = "options" | "processing" | "results";

const SENSITIVITY_LABELS: Record<Sensitivity, string> = {
  strict:   "Precise",
  balanced: "Balanced",
  loose:    "More Matches",
};

const THRESHOLDS: Record<Sensitivity, number> = {
  strict:   0.46,
  balanced: 0.60,
  loose:    0.72,
};

// ─── API helpers ───────────────────────────────────────────────────────────────

async function fetchEvent(slug: string): Promise<EventData> {
  const res = await fetch(`/api/events/${slug}/public`);
  if (!res.ok) throw new Error("Event not found");
  return (await res.json()).data;
}

// ─── Landing page ─────────────────────────────────────────────────────────────

export default function EventLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const router   = useRouter();

  const [flowActive, setFlowActive] = useState(false);

  const { data: event, isLoading, error } = useQuery({
    queryKey: ["event-public", slug],
    queryFn:  () => fetchEvent(slug),
    retry:    false,
  });

  if (flowActive && event) {
    return <FaceMatchFlow event={event} onBack={() => setFlowActive(false)} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-sm">
          <SearchX className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Event Not Found</h2>
          <p className="text-muted-foreground text-sm">
            This link doesn&apos;t point to a valid event.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative h-[45vh] min-h-[260px] overflow-hidden">
        {event.coverImageCDN ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.coverImageCDN} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-rose-500/30 to-pink-600/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Top pill */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-white/15 backdrop-blur-md border border-white/20 rounded-full text-white text-xs font-medium"
          >
            <Scan className="w-3.5 h-3.5 text-rose-300" />
            Wedding Gallery
          </motion.div>
        </div>

        {/* Event info */}
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 text-white">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <h1 className="text-2xl sm:text-4xl font-bold mb-2 leading-tight">{event.title}</h1>
            <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-white/70">
              {event.eventDate && (
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDate(event.eventDate)}</span>
              )}
              {event.location && (
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {event.location}</span>
              )}
              {!!event.photosCount && event.photosCount > 0 && (
                <span className="flex items-center gap-1"><Images className="w-3.5 h-3.5" /> {event.photosCount.toLocaleString()} photos</span>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Three options ─────────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-7 max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Face Recognition
          </div>
          <h2 className="text-lg sm:text-xl font-bold">Find your photos instantly</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Take or upload a selfie — our AI finds every photo you&apos;re in
          </p>
        </motion.div>

        <div className="flex flex-col gap-3">
          {/* Option 1 — Take Selfie (camera) */}
          <OptionCard
            delay={0.15}
            gradient="from-rose-500 to-pink-600"
            icon={<Camera className="w-6 h-6 text-white" />}
            title="Take a Selfie"
            desc="Open your camera and take a photo right now"
            badge="Recommended"
            badgeClass="bg-rose-500/20 text-rose-600"
            onClick={() => setFlowActive(true)}
            capture="user"
            onFile={(f) => {
              setFlowActive(true);
              // slight delay so FaceMatchFlow mounts first
              setTimeout(() => window.dispatchEvent(new CustomEvent("selfie-file", { detail: f })), 80);
            }}
          />

          {/* Option 2 — Upload from Gallery */}
          <OptionCard
            delay={0.22}
            gradient="from-violet-500 to-purple-600"
            icon={<ImagePlus className="w-6 h-6 text-white" />}
            title="Upload from Gallery"
            desc="Choose an existing photo from your gallery"
            badge=""
            badgeClass=""
            onClick={() => setFlowActive(true)}
            capture={undefined}
            onFile={(f) => {
              setFlowActive(true);
              setTimeout(() => window.dispatchEvent(new CustomEvent("selfie-file", { detail: f })), 80);
            }}
          />

          {/* Option 3 — View All Photos */}
          <motion.button
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.29 }}
            onClick={() => router.push(`/event/${slug}/gallery`)}
            className="flex items-center gap-4 p-4 rounded-2xl border-2 border-border hover:border-amber-400/60 bg-card text-left transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/10 active:scale-98"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center shrink-0 shadow-md">
              <Images className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Browse All Photos</p>
              <p className="text-xs text-muted-foreground truncate">
                See every photo from this event
                {!!event.photosCount && event.photosCount > 0 && ` · ${event.photosCount.toLocaleString()} total`}
              </p>
            </div>
            <span className="text-muted-foreground text-lg shrink-0">›</span>
          </motion.button>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-[11px] text-muted-foreground mt-6 flex items-center justify-center gap-1"
        >
          <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
          Powered by Memorable Pictures
        </motion.p>
      </div>
    </div>
  );
}

// ─── Reusable camera/gallery card ─────────────────────────────────────────────

function OptionCard({
  delay, gradient, icon, title, desc, badge, badgeClass,
  onClick, capture, onFile,
}: {
  delay: number;
  gradient: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge: string;
  badgeClass: string;
  onClick: () => void;
  capture: "user" | undefined;
  onFile: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="relative"
    >
      <button
        onClick={() => inputRef.current?.click()}
        className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-primary/20 hover:border-primary bg-card text-left transition-all duration-200 hover:shadow-lg hover:shadow-primary/10 active:scale-98"
      >
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-md`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-semibold text-sm">{title}</p>
            {badge && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badgeClass}`}>{badge}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
        <span className="text-primary text-lg shrink-0">›</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        {...(capture ? { capture } : {})}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) { onClick(); onFile(f); }
          // reset so re-selecting the same file triggers onChange
          e.target.value = "";
        }}
      />
    </motion.div>
  );
}

// ─── Face Match Flow ──────────────────────────────────────────────────────────

function FaceMatchFlow({ event, onBack }: { event: EventData; onBack: () => void }) {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();

  const [step, setStep]               = useState<Step>("options");
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [matches, setMatches]         = useState<EventPhoto[]>([]);
  const [liked, setLiked]             = useState<Set<string>>(new Set());
  const [loadingMsg, setLoadingMsg]   = useState("");
  const [loadingPct, setLoadingPct]   = useState(0);
  const [errorMsg, setErrorMsg]       = useState<string | null>(null);
  const [sensitivity, setSensitivity] = useState<Sensitivity>("balanced");

  const cameraRef      = useRef<HTMLInputElement>(null);
  const galleryRef     = useRef<HTMLInputElement>(null);
  // Holds the latest processFile so the event listener never has a stale closure
  const processFileRef = useRef<(file: File) => void>(() => {});

  const processFile = async (file: File) => {
    setSelfiePreview(URL.createObjectURL(file));
    setErrorMsg(null);
    setMatches([]);
    setStep("processing");
    setLoadingPct(5);

    try {
      // 1 ── Load models
      setLoadingMsg("Loading AI…");
      const {
        loadModels, getSelfieDescriptor, getPhotoDescriptors, euclideanDistance, NoFaceError,
      } = await import("@/lib/face-recognition");
      await loadModels();
      setLoadingPct(20);

      // 2 ── Detect face in selfie
      setLoadingMsg("Detecting your face…");
      const selfieDesc = await getSelfieDescriptor(file);
      if (!selfieDesc) throw new NoFaceError();
      setLoadingPct(30);

      // 3 ── Fetch all photo URLs for this event (up to 500)
      setLoadingMsg("Loading photos…");
      const photosRes  = await fetch(`/api/photos?eventId=${event._id}&limit=500`);
      const photosJson = await photosRes.json();
      const allPhotos: EventPhoto[] = photosJson.data?.photos ?? [];
      if (allPhotos.length === 0) {
        setErrorMsg("No photos have been uploaded to this event yet.");
        setStep("results");
        return;
      }
      setLoadingPct(35);

      // 4 ── Scan in parallel batches of 5, show results progressively
      const threshold = THRESHOLDS[sensitivity];
      const BATCH     = 5;
      const found: EventPhoto[] = [];

      for (let i = 0; i < allPhotos.length; i += BATCH) {
        const batch = allPhotos.slice(i, i + BATCH);

        const batchResults = await Promise.allSettled(
          batch.map(async (photo) => {
            const descs = await getPhotoDescriptors(photo.cdnUrl);
            let best = Infinity;
            for (const d of descs) {
              const dist = euclideanDistance(selfieDesc, d);
              if (dist < best) best = dist;
            }
            if (best <= threshold) {
              const confidence = Math.round(
                Math.max(0, Math.min(100, (1 - best / threshold) * 100)),
              );
              return { ...photo, confidence } as EventPhoto;
            }
            return null;
          }),
        );

        for (const r of batchResults) {
          if (r.status === "fulfilled" && r.value) found.push(r.value);
        }

        // Progressive update so user sees matches appearing live
        if (found.length > 0) {
          setMatches(
            [...found].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0)),
          );
        }

        const done = Math.min(i + BATCH, allPhotos.length);
        setLoadingPct(35 + Math.round((done / allPhotos.length) * 65));
        setLoadingMsg(`Scanning ${done} / ${allPhotos.length} photos…`);
      }

      setLoadingPct(100);
      setStep("results");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "NO_FACE_IN_SELFIE") {
        setErrorMsg("No face detected. Please use a clear, well-lit selfie.");
      } else {
        setErrorMsg("Something went wrong. Please try again.");
      }
      setStep("results");
    }
  };

  // Keep ref current so the event listener always calls the latest processFile
  processFileRef.current = processFile;

  // Listen for file dispatched by the landing page OptionCard
  // (the card fires a CustomEvent 80 ms after mounting this component)
  useEffect(() => {
    const handler = (e: Event) => {
      const file = (e as CustomEvent<File>).detail;
      if (file) processFileRef.current(file);
    };
    window.addEventListener("selfie-file", handler);
    return () => window.removeEventListener("selfie-file", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadPhoto = (url: string, name: string) => {
    const a    = document.createElement("a");
    a.href     = url;
    a.download = name || "photo.jpg";
    a.target   = "_blank";
    a.click();
    toast.success("Download started!");
  };

  // ── Step: options (pick camera or gallery) ────────────────────────────────
  if (step === "options") {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div>
            <h2 className="font-semibold text-sm">Find My Photos</h2>
            <p className="text-xs text-muted-foreground truncate">{event.title}</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-57px)] px-4 py-8">
          <div className="max-w-sm w-full">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-rose-500/20">
                <Brain className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-1.5">Upload Your Selfie</h2>
              <p className="text-muted-foreground text-sm">
                Our AI will find every photo from the event where you appear.
              </p>
            </motion.div>

            {/* Sensitivity */}
            <div className="mb-6">
              <p className="text-xs text-muted-foreground text-center mb-2 font-medium">Match sensitivity</p>
              <div className="flex gap-2">
                {(["strict", "balanced", "loose"] as Sensitivity[]).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setSensitivity(lvl)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                      sensitivity === lvl
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {SENSITIVITY_LABELS[lvl]}
                  </button>
                ))}
              </div>
            </div>

            {/* Two upload buttons */}
            <div className="flex flex-col gap-3">
              {/* Camera */}
              <label className="cursor-pointer">
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
                />
                <div className="flex items-center gap-4 p-4 rounded-2xl border-2 border-rose-500/30 hover:border-rose-500 bg-rose-500/5 hover:bg-rose-500/10 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shrink-0 shadow-md">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Take a Selfie</p>
                    <p className="text-xs text-muted-foreground">Open camera now</p>
                  </div>
                  <span className="ml-auto text-rose-500 text-lg">›</span>
                </div>
              </label>

              {/* Gallery */}
              <label className="cursor-pointer">
                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
                />
                <div className="flex items-center gap-4 p-4 rounded-2xl border-2 border-violet-500/30 hover:border-violet-500 bg-violet-500/5 hover:bg-violet-500/10 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md">
                    <ImagePlus className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Upload from Gallery</p>
                    <p className="text-xs text-muted-foreground">Choose an existing photo</p>
                  </div>
                  <span className="ml-auto text-violet-500 text-lg">›</span>
                </div>
              </label>

              {/* All photos */}
              <button
                onClick={() => router.push(`/event/${slug}/gallery`)}
                className="flex items-center gap-4 p-4 rounded-2xl border-2 border-border hover:border-amber-400/60 bg-card transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center shrink-0 shadow-md">
                  <Images className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Browse All Photos</p>
                  <p className="text-xs text-muted-foreground">See the full gallery</p>
                </div>
                <span className="ml-auto text-amber-500 text-lg">›</span>
              </button>
            </div>

            <p className="text-center text-[11px] text-muted-foreground mt-6">
              Face detection runs in your browser — your selfie is never stored.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: processing ──────────────────────────────────────────────────────
  if (step === "processing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-xs w-full"
        >
          {/* Spinning selfie avatar */}
          <div className="relative w-28 h-28 mx-auto mb-7">
            {selfiePreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selfiePreview} alt="Selfie" className="w-28 h-28 rounded-full object-cover border-4 border-primary shadow-xl" />
            )}
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-primary/30"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-1.5 rounded-full border-4 border-dashed border-rose-400/25"
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
            />
          </div>

          <h2 className="text-xl font-bold mb-2">Scanning…</h2>
          <p className="text-muted-foreground text-sm mb-5">{loadingMsg}</p>

          {/* Progress bar */}
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
            <motion.div
              className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full"
              animate={{ width: `${loadingPct}%` }}
              transition={{ ease: "easeOut", duration: 0.4 }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{loadingPct}%</p>
        </motion.div>
      </div>
    );
  }

  // ── Step: results ─────────────────────────────────────────────────────────
  if (errorMsg || matches.length === 0) {
    const isNoFace = errorMsg?.includes("No face detected");

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-sm w-full"
          >
            <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mx-auto mb-5">
              <SearchX className="w-9 h-9 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold mb-2">
              {isNoFace ? "No Face Detected" : errorMsg ? "Couldn't Find Your Photos" : "No Matches Found"}
            </h2>
            <p className="text-muted-foreground text-sm mb-7 leading-relaxed">
              {errorMsg ?? "We scanned every photo but didn't find you. Try a clearer selfie or switch to 'More Matches'."}
            </p>

            <div className="flex flex-col gap-3 items-center">
              <div className="flex gap-3">
                <Button variant="outline" onClick={onBack}>Back</Button>
                <Button onClick={() => { setStep("options"); setSelfiePreview(null); setErrorMsg(null); }}>
                  Try Again
                </Button>
              </div>

              {sensitivity !== "loose" && (
                <button
                  className="text-xs text-primary underline underline-offset-2"
                  onClick={() => { setSensitivity("loose"); setStep("options"); setSelfiePreview(null); setErrorMsg(null); }}
                >
                  Try with &quot;More Matches&quot; sensitivity →
                </button>
              )}

              <button
                className="text-xs text-muted-foreground underline underline-offset-2"
                onClick={() => router.push(`/event/${slug}/gallery`)}
              >
                Browse all photos instead →
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ── Results grid ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <X className="w-4 h-4" />
        </button>
        {selfiePreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={selfiePreview} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-primary" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm">Your Photos Found!</h2>
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {matches.length} match{matches.length === 1 ? "" : "es"} · {event.title}
          </p>
        </div>
        <button
          onClick={() => router.push(`/event/${slug}/gallery`)}
          className="shrink-0 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2 py-1 transition-colors"
        >
          All Photos
        </button>
      </div>

      {/* Masonry grid */}
      <div className="p-3 sm:p-4">
        <div className="columns-2 sm:columns-3 gap-2 sm:gap-3 space-y-2 sm:space-y-3">
          {matches.map((photo, i) => (
            <motion.div
              key={photo._id}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(i * 0.06, 0.6) }}
              className="break-inside-avoid rounded-2xl overflow-hidden shadow-sm relative group bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.cdnUrl}
                alt={photo.originalName ?? ""}
                className="w-full object-cover"
                loading="lazy"
              />

              {/* Confidence badge */}
              {photo.confidence !== undefined && (
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-green-500/90 text-white text-[10px] font-bold rounded-full">
                  {photo.confidence}%
                </div>
              )}

              {/* Like button */}
              <button
                onClick={() =>
                  setLiked((p) => {
                    const n = new Set(p);
                    n.has(photo._id) ? n.delete(photo._id) : n.add(photo._id);
                    return n;
                  })
                }
                className="absolute top-2 right-2 p-1.5 bg-black/40 rounded-xl backdrop-blur-sm"
              >
                <Heart
                  className={`w-3.5 h-3.5 transition-colors ${liked.has(photo._id) ? "fill-rose-500 text-rose-500" : "text-white"}`}
                />
              </button>

              {/* Download button */}
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => downloadPhoto(photo.cdnUrl, photo.originalName ?? "photo.jpg")}
                  className="flex items-center justify-center gap-1 w-full py-1.5 text-xs text-white font-medium bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-colors"
                >
                  <Download className="w-3 h-3" /> Save
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground mb-3">
            Showing {matches.length} photo{matches.length === 1 ? "" : "s"} where you appear
          </p>
          <Button variant="outline" size="sm" onClick={() => router.push(`/event/${slug}/gallery`)}>
            <Images className="w-3.5 h-3.5 mr-1.5" /> View All Photos
          </Button>
        </div>
      </div>
    </div>
  );
}
