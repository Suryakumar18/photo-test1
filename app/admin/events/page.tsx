"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, Eye, Image as ImageIcon, MapPin, Plus, QrCode, Search } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CreateEventModal } from "@/components/events/create-event-modal";
import { EventDetailModal } from "@/components/events/event-detail-modal";
import { formatDate, formatBytes } from "@/lib/utils";

interface EventRow {
  _id: string;
  title: string;
  slug: string;
  brideName?: string;
  groomName?: string;
  eventDate?: string;
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

const statusConfig = {
  upcoming: { label: "Upcoming", variant: "blue" as const },
  live:     { label: "Live",     variant: "green" as const },
  completed:{ label: "Completed",variant: "gold" as const },
  archived: { label: "Archived", variant: "outline" as const },
};

async function fetchEvents(): Promise<EventRow[]> {
  const token = document.cookie.match(/auth-token=([^;]+)/)?.[1] || "";
  const res = await fetch("/api/events?limit=100", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return (await res.json()).data?.events ?? [];
}

export default function EventsPage() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
  });

  const filtered = events.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      (e.brideName ?? "").toLowerCase().includes(q) ||
      (e.groomName ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Events" subtitle={`${events.length} total events`} />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search events..."
              icon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button className="gap-2 rounded-xl w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            Create Event
          </Button>
        </div>

        {/* Events grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mb-4">
              <Calendar className="w-9 h-9 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-lg mb-2">
              {search ? "No events match your search" : "No events yet"}
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              {search ? "Try a different search term." : "Create your first wedding event to get started."}
            </p>
            {!search && (
              <Button className="gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4" /> Create Event
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((event, i) => (
              <motion.div
                key={event._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.4) }}
              >
                <Card
                  className="overflow-hidden border border-border/50 hover-lift group cursor-pointer"
                  onClick={() => setSelectedEvent(event)}
                >
                  {/* Cover */}
                  <div className="relative h-44 overflow-hidden">
                    {event.coverImageCDN ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={event.coverImageCDN}
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-rose-500/20 to-pink-600/20 flex items-center justify-center">
                        <Calendar className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute top-3 right-3">
                      <Badge variant={statusConfig[event.status].variant}>
                        {statusConfig[event.status].label}
                      </Badge>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <h3 className="font-bold text-lg leading-tight truncate">{event.title}</h3>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <div className="space-y-2 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        {event.eventDate ? formatDate(event.eventDate) : "—"}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{event.location ?? "—"}</span>
                      </div>
                    </div>

                    <div className="flex gap-4 text-xs text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5" />
                        {event.photosCount ?? 0}
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {event.viewsCount ?? 0}
                      </div>
                      <div className="ml-auto">{formatBytes(event.storageUsed ?? 0)}</div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        Images & Upload
                      </Button>
                      <a
                        href={`/event/${event.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button size="sm" className="w-full gap-1.5">
                          <QrCode className="w-3.5 h-3.5" />
                          Guest Link
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateEventModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <EventDetailModal
        event={selectedEvent}
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
