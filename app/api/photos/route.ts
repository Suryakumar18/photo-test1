import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Photo } from "@/models/Photo";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId  = searchParams.get("eventId");
    const page     = Math.max(1, parseInt(searchParams.get("page")  || "1"));
    const limit    = Math.min(300, parseInt(searchParams.get("limit") || "200"));

    await connectDB();

    // ── Event-scoped query (used by public gallery + event detail) ────────────
    if (eventId) {
      const total  = await Photo.countDocuments({ eventId });
      const photos = await Photo.find({ eventId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      return NextResponse.json({
        success: true,
        data: { photos, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
      });
    }

    // ── Studio-wide query (used by admin gallery page) ────────────────────────
    // Requires a valid auth token to determine the studio
    const auth = requireAuth(req, ["admin", "photographer"]);
    if ("error" in auth) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const studioId = auth.user.studioId;
    if (!studioId) {
      return NextResponse.json(
        { success: false, error: "No studio linked to this account" },
        { status: 400 }
      );
    }

    // Aggregate: fetch photos + join event title in one query
    const [photos, total] = await Promise.all([
      Photo.aggregate([
        { $match: { studioId } },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $lookup: {
            from: "events",
            localField: "eventId",
            foreignField: "_id",
            as: "_ev",
          },
        },
        {
          $addFields: {
            eventTitle: {
              $ifNull: [{ $arrayElemAt: ["$_ev.title", 0] }, "Unknown Event"],
            },
            eventId: { $toString: "$eventId" },
          },
        },
        { $project: { _ev: 0 } },
      ]),
      Photo.countDocuments({ studioId }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        photos,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error("Get photos error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}
