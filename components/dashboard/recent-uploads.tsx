"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatRelativeTime, formatBytes } from "@/lib/utils";
import type { Photo } from "@/types";

interface RecentUploadsProps {
  photos?: Photo[];
  isLoading?: boolean;
}

const mockPhotos = Array.from({ length: 8 }, (_, i) => ({
  _id: String(i),
  eventId: "event1",
  filename: `photo-${i + 1}.jpg`,
  originalName: `DSC_${String(i + 1).padStart(4, "0")}.jpg`,
  storagePath: "",
  cdnUrl: `https://images.unsplash.com/photo-${["1519741497674-611481863552", "1583939003579-730e3918a45a", "1606216794074-735e91aa2c92", "1511285560929-80b456fea0bc", "1591604021695-0c69b7c05981", "1465495976277-4387d4b0b4c6", "1563729784474-d77dbb933a9e", "1595408076683-5d0c009e71e4"][i]}?w=100&q=80`,
  size: Math.floor(Math.random() * 5000000) + 1000000,
  mimeType: "image/jpeg",
  uploadedBy: "user1",
  favorites: Math.floor(Math.random() * 20),
  downloads: Math.floor(Math.random() * 10),
  isProcessed: true,
  hasFaces: i % 2 === 0,
  faceCount: i % 2 === 0 ? Math.floor(Math.random() * 5) + 1 : 0,
  createdAt: new Date(Date.now() - i * 15 * 60 * 1000),
  updatedAt: new Date(),
}));

export function RecentUploads({ photos, isLoading }: RecentUploadsProps) {
  const items = photos || mockPhotos;

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Recent Uploads</CardTitle>
          <Link href="/admin/gallery">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              View All
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {items.slice(0, 8).map((photo) => (
              <div
                key={photo._id}
                className="aspect-square rounded-xl overflow-hidden relative group cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.cdnUrl}
                  alt={photo.originalName}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-1.5">
                  <p className="text-white text-[10px] truncate">{photo.originalName}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
