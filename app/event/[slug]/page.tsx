"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Brain, Calendar, Images, MapPin, Scan,
  Sparkles, Users, X, Loader2, Download, Heart, SearchX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import {
  loadModels, getSelfieDescriptor, NoFaceError, type MatchResult,
  SENSITIVITY, type SensitivityLevel,
} from "@/lib/face-recognition";
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
}

// ─── fetchers ─────────────────────────────────────────────────────────────────

async function fetchEvent(slug: string): Promise<EventData> {
  const res = await fetch(`/api/events/${slug}/public`);
  if (!res.ok) throw new Error("Event not found");
  return (await res.json()).data;
}

async function fetchPhotos(eventId: string): Promise<EventPhoto[]> {
  const res = await fetch(`/api/photos?eventId=${eventId}&limit=300`);
  if (!res.ok) return [];
  return (await res.json()).data.photos ?? [];
}

// ─── Main landing page (after QR scan) ───────────────────────────────────────

export default function EventLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [choice, setChoice] = useState<"my-photos" | null>(null);

  const { data: event, isLoading, error } = useQuery({
    queryKey: ["event-public", slug],
    queryFn: () => fetchEvent(slug),
    retry: false,
  });

  if (choice === "my-photos" && event) {
    return <FaceMatchFlow event={event} onBack={() => setChoice(null)} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading event…</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <SearchX className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">Event Not Found</h2>
          <p className="text-muted-foreground text-sm">
            This QR code doesn&apos;t link to a valid event, or it may have been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative h-[50vh] min-h-[300px] sm:h-[55vh] overflow-hidden">
        {event.coverImageCDN ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.coverImageCDN} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-rose-500/30 to-pink-600/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />

        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-max">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-md border border-white/20 rounded-full text-white text-xs sm:text-sm font-medium"
          >
            <Scan className="w-4 h-4 text-rose-300" />
            Wedding Gallery
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 text-white">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 leading-tight">{event.title}</h1>
            <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm text-white/70">
              {event.eventDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" /> {formatDate(event.eventDate)}
                </span>
              )}
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> {event.location}
                </span>
              )}
              {!!event.photosCount && event.photosCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <Images className="w-4 h-4" /> {(event.photosCount ?? 0).toLocaleString()} photos
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Two options ────────────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-8 sm:py-10 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-center mb-7"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Powered by AI face recognition
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mb-2">How would you like to explore?</h2>
          <p className="text-muted-foreground text-sm">
            Find photos of yourself instantly, or browse the entire gallery
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {/* Option 1 — Find My Photos */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            onClick={() => setChoice("my-photos")}
            className="group relative overflow-hidden rounded-3xl border-2 border-primary/30 hover:border-primary bg-card p-6 sm:p-7 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 active:scale-95"
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full pointer-events-none" />
            <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg group-hover:shadow-rose-500/30 transition-shadow">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold mb-2">Find My Photos</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Upload a selfie and our AI scans every photo to find the ones you appear in.
            </p>
            <div className="flex items-center gap-1.5 mt-5 text-primary text-sm font-semibold">
              <span>Upload selfie</span>
              <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>→</motion.span>
            </div>
            <div className="absolute top-4 right-4 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full">AI</div>
          </motion.button>

          {/* Option 2 — View All Photos */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            onClick={() => router.push(`/event/${slug}/gallery`)}
            className="group relative overflow-hidden rounded-3xl border-2 border-border hover:border-amber-400/60 bg-card p-6 sm:p-7 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1 active:scale-95"
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full pointer-events-none" />
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-2xl flex items-center justify-center mb-5 shadow-lg group-hover:shadow-amber-500/30 transition-shadow">
              <Images className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold mb-2">View All Photos</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Browse the complete wedding gallery — every moment captured from this event.
            </p>
            <div className="flex items-center gap-1.5 mt-5 text-amber-500 text-sm font-semibold">
              <span>Open gallery</span>
              <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}>→</motion.span>
            </div>
            {!!event.photosCount && event.photosCount > 0 && (
              <div className="absolute top-4 right-4 px-2 py-0.5 bg-amber-500/10 text-amber-600 text-[10px] font-bold rounded-full">
                {event.photosCount}+
              </div>
            )}
          </motion.button>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-muted-foreground mt-8 flex items-center justify-center gap-1.5"
        >
          <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
          Powered by Memorable Pictures · AI Wedding Photography
        </motion.p>
      </div>
    </div>
  );
}

// ─── Face Match Flow (REAL face recognition) ─────────────────────────────────

function FaceMatchFlow({ event, onBack }: { event: EventData; onBack: () => void }) {
  const [step, setStep] = useState<"upload" | "processing" | "results">("upload");
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchResult<EventPhoto>[]>([]);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState({ done: 0, total: 0, found: 0 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sensitivity, setSensitivity] = useState<SensitivityLevel>("balanced");

  // photos list is no longer needed client-side — server does the matching
  // (kept as empty array to avoid refactoring the selfie count display below)
  const photos: EventPhoto[] = [];

  const handleSelfieUpload = async (file: File) => {
    setSelfiePreview(URL.createObjectURL(file));
    setErrorMsg(null);
    setMatches([]);
    setStep("processing");

    try {
      // Phase 1 — load models + compute selfie descriptor in the browser (1 image, ~2 s)
      setProgress({ done: 0, total: 0, found: 0 }); // shows "Loading AI models…"
      await loadModels();
      setProgress({ done: 0, total: 1, found: 0 });  // shows "Detecting your face…"

      const selfieDescriptor = await getSelfieDescriptor(file);
      if (!selfieDescriptor) throw new NoFaceError();

      setProgress({ done: 1, total: 1, found: 0 }); // "Searching event photos…"

      // Phase 2 — send descriptor to server; server compares against pre-indexed embeddings
      // This takes < 1 second even for 10,000 stored face embeddings.
      const res = await fetch("/api/face-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descriptor: Array.from(selfieDescriptor),   // Float32Array → number[]
          eventId:    event._id,
          threshold:  SENSITIVITY[sensitivity],
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Face match failed");

      if (!json.data.indexed) {
        // Admin hasn't indexed faces for this event yet
        setErrorMsg(
          "Face search is not set up for this event yet. " +
          "Please ask the photographer to scan the event photos, or browse the full gallery."
        );
        setStep("results");
        return;
      }

      const serverPhotos: EventPhoto[] = json.data.photos;
      setProgress({ done: 1, total: 1, found: serverPhotos.length });

      // Build MatchResult objects from server response (confidence already computed)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMatches(serverPhotos.map((p: any) => ({
        photo: p,
        distance: 1 - (p.confidence / 100),
        confidence: p.confidence,
      })));
      setStep("results");
    } catch (err) {
      if (err instanceof NoFaceError) {
        setErrorMsg("No face detected in your selfie. Please use a clear, front-facing photo with good lighting.");
      } else {
        setErrorMsg("Something went wrong. Please try again.");
      }
      setStep("results");
    }
  };

  const downloadPhoto = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name || "photo.jpg";
    a.target = "_blank";
    a.click();
    toast.success("Download started!");
  };

  // ── Processing ─────────────────────────────────────────────────────────────
  if (step === "processing") {
    const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-sm w-full">
          <div className="relative w-32 h-32 mx-auto mb-8">
            {selfiePreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selfiePreview} alt="Selfie" className="w-32 h-32 rounded-full object-cover border-4 border-primary shadow-xl" />
            )}
            <motion.div
              className="absolute inset-0 border-4 border-primary/30 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-2 border-4 border-rose-400/20 border-dashed rounded-full"
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
            />
          </div>
          <h2 className="text-2xl font-bold mb-2">Scanning Photos…</h2>
          <p className="text-muted-foreground text-sm mb-6">
            {progress.total === 0
              ? "Loading AI face model…"
              : progress.done === 0
              ? "Detecting your face in the selfie…"
              : "Searching " + (progress.found > 0 ? `— ${progress.found} match${progress.found === 1 ? "" : "es"} found!` : "event photos…")}
          </p>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full"
              animate={{ width: progress.total === 0 ? "15%" : progress.done < progress.total ? "70%" : "100%" }}
              transition={{ ease: "linear", duration: 0.5 }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {progress.total === 0 && "Initializing face recognition…"}
            {progress.total > 0 && progress.done === 0 && "Analysing selfie…"}
            {progress.done > 0 && "Comparing against indexed photos on server…"}
          </p>
        </motion.div>
      </div>
    );
  }

  // ── Results ────────────────────────────────────────────────────────────────
  if (step === "results") {
    // Error or no matches
    if (errorMsg || matches.length === 0) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mx-auto mb-5">
              <SearchX className="w-9 h-9 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold mb-2">
              {errorMsg ? "Couldn't Scan Your Selfie" : "No Photos Found"}
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              {errorMsg ??
                "Our AI scanned every photo but didn't find a match. Try a clearer selfie, or the photographer may still be uploading."}
            </p>
            <div className="flex flex-col gap-3 items-center">
              <div className="flex gap-3">
                <Button variant="outline" onClick={onBack}>Back</Button>
                <Button onClick={() => { setStep("upload"); setSelfiePreview(null); setErrorMsg(null); }}>
                  Try Again
                </Button>
              </div>
              {!errorMsg && sensitivity !== "loose" && (
                <button
                  className="text-xs text-primary underline underline-offset-2"
                  onClick={() => {
                    setSensitivity("loose");
                    setStep("upload");
                    setSelfiePreview(null);
                    setErrorMsg(null);
                  }}
                >
                  Try with "More Matches" sensitivity →
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
          {selfiePreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selfiePreview} alt="You" className="w-8 h-8 rounded-full object-cover border-2 border-primary" />
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm">Your Photos Found!</h2>
            <p className="text-xs text-muted-foreground truncate">
              {matches.length} match{matches.length === 1 ? "" : "es"} · {event.title}
            </p>
          </div>
        </div>

        <div className="p-3 sm:p-4">
          <div className="columns-2 md:columns-3 gap-2 sm:gap-3 space-y-2 sm:space-y-3">
            {matches.map(({ photo, confidence }, i) => (
              <motion.div
                key={photo._id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.05, 0.5) }}
                className="break-inside-avoid rounded-2xl overflow-hidden shadow-md relative group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.cdnUrl} alt={photo.originalName ?? ""} className="w-full object-cover" loading="lazy" />

                {/* Confidence badge */}
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-green-500/90 text-white text-[10px] font-bold rounded-full backdrop-blur-sm">
                  {confidence}% match
                </div>

                <button
                  onClick={() => setLiked((prev) => {
                    const n = new Set(prev);
                    if (n.has(photo._id)) n.delete(photo._id); else n.add(photo._id);
                    return n;
                  })}
                  className="absolute top-2 right-2 p-2 bg-black/40 rounded-xl backdrop-blur-sm sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <Heart className={`w-4 h-4 transition-colors ${liked.has(photo._id) ? "fill-rose-500 text-rose-500" : "text-white"}`} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    onClick={() => downloadPhoto(photo.cdnUrl, photo.originalName ?? "photo.jpg")}
                    className="h-7 text-xs w-full bg-white/20 hover:bg-white/30 border-0"
                  >
                    <Download className="w-3 h-3 mr-1" /> Save
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Upload Selfie ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <X className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <h2 className="font-semibold text-sm">Find My Photos</h2>
          <p className="text-xs text-muted-foreground truncate">{event.title}</p>
        </div>
      </div>

      <div className="flex items-center justify-center min-h-[calc(100vh-57px)] px-4 py-8">
        <div className="max-w-sm w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-rose-500/20">
              <Brain className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Upload Your Selfie</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Take a clear, front-facing selfie. Our AI will scan all {photos.length || ""} event photos
              and find the ones you&apos;re in.
            </p>
          </motion.div>

          {/* Sensitivity selector */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <p className="text-xs text-muted-foreground text-center mb-2 font-medium">Match sensitivity</p>
            <div className="flex gap-2 mb-5">
              {(["strict", "balanced", "loose"] as SensitivityLevel[]).map((lvl) => {
                const labels: Record<SensitivityLevel, string> = {
                  strict: "Precise",
                  balanced: "Balanced",
                  loose: "More Matches",
                };
                return (
                  <button
                    key={lvl}
                    onClick={() => setSensitivity(lvl)}
                    className={`flex-1 py-2 px-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                      sensitivity === lvl
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {labels[lvl]}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground text-center mb-4">
              {sensitivity === "strict" && "Only very clear face matches — fewest false positives"}
              {sensitivity === "balanced" && "Best for most photos — recommended starting point"}
              {sensitivity === "loose" && "Finds more matches — good for group or angled shots"}
            </p>
          </motion.div>

          <motion.label initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="block cursor-pointer">
            <input
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleSelfieUpload(file);
              }}
            />
            <div className="border-2 border-dashed border-primary/30 rounded-3xl p-10 sm:p-12 text-center hover:border-primary hover:bg-primary/5 transition-all duration-300 group">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-1.5">Take or Upload Selfie</h3>
              <p className="text-sm text-muted-foreground">Tap to open camera or choose from gallery</p>
            </div>
          </motion.label>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mt-6 grid grid-cols-3 gap-3 sm:gap-4 text-center">
            {[
              { icon: Brain,    label: "Real AI" },
              { icon: Sparkles, label: "On-Device" },
              { icon: Images,   label: "Private" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </motion.div>

          <p className="text-center text-[11px] text-muted-foreground mt-5">
            Face matching runs entirely in your browser — your selfie never leaves your device.
          </p>
        </div>
      </div>
    </div>
  );
}
