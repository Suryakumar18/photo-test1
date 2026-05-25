import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Studio } from "@/models/Studio";
import { Photo } from "@/models/Photo";
import { Event } from "@/models/Event";
import { User } from "@/models/User";
import { requireSuperAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    await connectDB();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalStudios,
      activeStudios,
      trialStudios,
      suspendedStudios,
      totalPhotos,
      totalEvents,
      totalUsers,
      storageResult,
      newStudiosThisWeek,
      storageByPlan,
      studioGrowth,
      topStudios,
    ] = await Promise.all([
      Studio.countDocuments(),
      Studio.countDocuments({ status: "active" }),
      Studio.countDocuments({ status: "trial" }),
      Studio.countDocuments({ status: "suspended" }),
      Photo.countDocuments(),
      Event.countDocuments(),
      User.countDocuments(),
      Studio.aggregate([{ $group: { _id: null, total: { $sum: "$storageUsed" } } }]),
      Studio.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Studio.aggregate([
        { $group: { _id: "$plan", count: { $sum: 1 }, storage: { $sum: "$storageUsed" } } },
      ]),
      Studio.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Studio.find()
        .sort({ storageUsed: -1 })
        .limit(5)
        .select("studioId name storageUsed storageLimit photosCount eventsCount status plan")
        .lean(),
    ]);

    const totalStorageUsed = storageResult[0]?.total || 0;

    const uploadTrend = studioGrowth.map((d) => ({
      date: new Date(d._id).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: d.count,
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalStudios,
        activeStudios,
        trialStudios,
        suspendedStudios,
        totalPhotos,
        totalEvents,
        totalUsers,
        totalStorageUsed,
        newStudiosThisWeek,
        storageByPlan,
        studioGrowth: uploadTrend,
        topStudios,
      },
    });
  } catch (error) {
    console.error("Super admin stats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
