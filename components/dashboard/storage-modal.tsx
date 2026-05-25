"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { HardDrive, Image as ImageIcon, Calendar, X, Loader2 } from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface StorageEvent {
  _id: string;
  title: string;
  storageUsed: number;
  photosCount: number;
}

async function fetchEvents(): Promise<StorageEvent[]> {
  const token = document.cookie.match(/auth-token=([^;]+)/)?.[1] || "";
  const res = await fetch("/api/events?limit=100", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return (await res.json()).data?.events ?? [];
}

// 50 GB plan quota for the progress bar
const QUOTA_BYTES = 50 * 1024 * 1024 * 1024;

export function StorageModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["storage-events"],
    queryFn: fetchEvents,
    enabled: open,
  });

  const totalStorage = events.reduce((sum, e) => sum + (e.storageUsed || 0), 0);
  const totalPhotos = events.reduce((sum, e) => sum + (e.photosCount || 0), 0);
  const usedPct = Math.min((totalStorage / QUOTA_BYTES) * 100, 100);

  const sorted = [...events].sort((a, b) => (b.storageUsed || 0) - (a.storageUsed || 0));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="bg-background rounded-3xl w-full max-w-md shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold">Storage Usage</h2>
                  <p className="text-xs text-muted-foreground">Across all events</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {isLoading ? (
              <div className="p-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="p-5 space-y-5 overflow-y-auto">
                {/* Total usage */}
                <div className="rounded-2xl bg-muted/50 p-4">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-2xl font-bold">{formatBytes(totalStorage)}</span>
                    <span className="text-xs text-muted-foreground">of {formatBytes(QUOTA_BYTES)}</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${usedPct}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{usedPct.toFixed(1)}% used</p>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-border/50 p-3 flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-rose-500" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{totalPhotos.toLocaleString()}</p>
                      <p className="text-[11px] text-muted-foreground">Photos</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/50 p-3 flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{events.length}</p>
                      <p className="text-[11px] text-muted-foreground">Events</p>
                    </div>
                  </div>
                </div>

                {/* Per-event breakdown */}
                {sorted.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                      By Event
                    </p>
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {sorted.map((e) => {
                        const pct = totalStorage > 0 ? (e.storageUsed / totalStorage) * 100 : 0;
                        return (
                          <div key={e._id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium truncate pr-2">{e.title}</span>
                              <span className="text-muted-foreground shrink-0">
                                {formatBytes(e.storageUsed || 0)}
                              </span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary/70 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {events.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No events yet — storage is empty.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
