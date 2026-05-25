import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { Studio } from "@/models/Studio";
import { Photo } from "@/models/Photo";
import { Event } from "@/models/Event";
import { ActivityLog } from "@/models/ActivityLog";
import { getSuperAdminFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const admin = getSuperAdminFromRequest(req);
  if (!admin || admin.role !== "super_admin") {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // stream closed
        }
      };

      const tick = async () => {
        try {
          await connectDB();

          const now = new Date();
          const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
          const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
          const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

          const [
            totalStudios,
            activeStudios,
            totalPhotos,
            storageAgg,
            uploadsLastMinute,
            uploadsLastHour,
            uploadsLast24h,
            activeEventsCount,
            recentActivity,
            studioBreakdown,
            hourlyUploads,
          ] = await Promise.all([
            Studio.countDocuments(),
            Studio.countDocuments({ status: { $in: ["active", "trial"] } }),
            Photo.countDocuments(),
            Studio.aggregate([
              { $group: { _id: null, total: { $sum: "$storageUsed" }, limit: { $sum: "$storageLimit" } } },
            ]),
            Photo.countDocuments({ createdAt: { $gte: oneMinuteAgo } }),
            Photo.countDocuments({ createdAt: { $gte: oneHourAgo } }),
            Photo.countDocuments({ createdAt: { $gte: twentyFourHoursAgo } }),
            Event.countDocuments({ status: "live" }),
            ActivityLog.find()
              .sort({ createdAt: -1 })
              .limit(8)
              .select("studioId type description createdAt metadata")
              .lean(),
            Studio.find()
              .sort({ storageUsed: -1 })
              .limit(10)
              .select("studioId name storageUsed storageLimit status plan photosCount eventsCount lastActivity")
              .lean(),
            Photo.aggregate([
              { $match: { createdAt: { $gte: new Date(now.getTime() - 60 * 60 * 1000) } } },
              {
                $group: {
                  _id: {
                    $dateToString: { format: "%H:%M", date: "$createdAt" },
                  },
                  count: { $sum: 1 },
                },
              },
              { $sort: { _id: 1 } },
              { $limit: 60 },
            ]),
          ]);

          send({
            timestamp: now.toISOString(),
            totalStudios,
            activeStudios,
            totalPhotos,
            totalStorageUsed: storageAgg[0]?.total || 0,
            totalStorageLimit: storageAgg[0]?.limit || 0,
            uploadsLastMinute,
            uploadsLastHour,
            uploadsLast24h,
            activeEventsCount,
            recentActivity,
            studioBreakdown,
            hourlyUploads: hourlyUploads.map((h) => ({ time: h._id, count: h.count })),
          });
        } catch (err) {
          console.error("SSE tick error:", err);
          send({ error: "data fetch failed", timestamp: new Date().toISOString() });
        }
      };

      await tick();
      const interval = setInterval(tick, 4000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
