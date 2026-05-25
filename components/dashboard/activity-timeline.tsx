"use client";

import { formatRelativeTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Download, Heart, Upload, Users, Zap } from "lucide-react";
import type { Activity } from "@/types";

const mockActivities: Activity[] = [
  {
    _id: "1",
    type: "upload",
    description: "47 photos uploaded to Priya & Arjun Wedding",
    createdAt: new Date(Date.now() - 5 * 60 * 1000),
  },
  {
    _id: "2",
    type: "face_match",
    description: "Face match found 23 photos for a guest",
    createdAt: new Date(Date.now() - 12 * 60 * 1000),
  },
  {
    _id: "3",
    type: "event_created",
    description: "New event created: Kavitha & Suresh",
    createdAt: new Date(Date.now() - 45 * 60 * 1000),
  },
  {
    _id: "4",
    type: "download",
    description: "Gallery batch downloaded (180 photos)",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    _id: "5",
    type: "view",
    description: "42 new visitors scanned QR code",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
];

const activityIcons = {
  upload: { icon: Upload, color: "bg-blue-500/10 text-blue-500" },
  face_match: { icon: Users, color: "bg-violet-500/10 text-violet-500" },
  event_created: { icon: Camera, color: "bg-rose-500/10 text-rose-500" },
  download: { icon: Download, color: "bg-green-500/10 text-green-500" },
  view: { icon: Zap, color: "bg-amber-500/10 text-amber-500" },
};

interface ActivityTimelineProps {
  activities?: Activity[];
  isLoading?: boolean;
}

export function ActivityTimeline({ activities, isLoading }: ActivityTimelineProps) {
  const items = activities || mockActivities;

  return (
    <Card className="border border-border/50 h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-muted animate-pulse rounded w-4/5" />
                  <div className="h-2.5 bg-muted animate-pulse rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {items.slice(0, 5).map((activity) => {
              const { icon: Icon, color } =
                activityIcons[activity.type] || activityIcons.upload;
              return (
                <div key={activity._id} className="flex gap-3 items-start">
                  <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium leading-snug truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatRelativeTime(activity.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
