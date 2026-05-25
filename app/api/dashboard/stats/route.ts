import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Event } from "@/models/Event";
import { Photo } from "@/models/Photo";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ["admin", "photographer"]);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const studioId = auth.user.studioId;
  // Scope all queries to this studio; super-admin-less accounts (studioId=undefined) see everything
  const filter = studioId ? { studioId } : {};

  try {
    await connectDB();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalEvents, totalPhotos, storageResult, recentPhotos, uploadTrendData] =
      await Promise.all([
        Event.countDocuments(filter),
        Photo.countDocuments(filter),
        Photo.aggregate([
          ...(studioId ? [{ $match: { studioId } }] : []),
          { $group: { _id: null, total: { $sum: "$size" } } },
        ]),
        Photo.find(filter).sort({ createdAt: -1 }).limit(8).lean(),
        Photo.aggregate([
          { $match: { ...filter, createdAt: { $gte: thirtyDaysAgo } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

    const storageUsed = storageResult[0]?.total || 0;

    const uploadTrend = uploadTrendData.map((d) => ({
      date: new Date(d._id).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: d.count,
    }));

    // Real activity from recent uploads
    const recentActivity = recentPhotos.slice(0, 3).map((p, i) => ({
      _id: String(i + 1),
      type: "upload" as const,
      description: `Photo uploaded: ${p.originalName || p.filename}`,
      createdAt: p.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalEvents,
        totalPhotos,
        totalVideos: 0,
        storageUsed,
        totalVisitors: 0,
        faceMatchCount: 0,
        liveUploads: 0,
        revenue: 0,
        recentPhotos,
        activityTimeline: recentActivity,
        uploadTrend,
        visitorTrend: [],
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
