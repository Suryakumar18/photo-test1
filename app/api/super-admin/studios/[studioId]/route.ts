import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Studio } from "@/models/Studio";
import { Photo } from "@/models/Photo";
import { Event } from "@/models/Event";
import { User } from "@/models/User";
import { ActivityLog } from "@/models/ActivityLog";
import { requireSuperAdmin } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ studioId: string }> }) {
  const auth = requireSuperAdmin(req);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { studioId } = await params;

  try {
    await connectDB();

    const [studio, recentEvents, recentPhotos, recentActivity, users] = await Promise.all([
      Studio.findOne({ studioId }).lean(),
      Event.find({ studioId }).sort({ createdAt: -1 }).limit(6).lean(),
      Photo.find({ studioId })
        .sort({ createdAt: -1 })
        .limit(12)
        .select("cdnUrl thumbnailUrl filename originalName size createdAt mimeType")
        .lean(),
      ActivityLog.find({ studioId }).sort({ createdAt: -1 }).limit(15).lean(),
      User.find({ studioId })
        .select("-password")
        .sort({ role: 1, createdAt: -1 })
        .lean(),
    ]);

    if (!studio) {
      return NextResponse.json({ success: false, error: "Studio not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { studio, recentEvents, recentPhotos, recentActivity, users },
    });
  } catch (error) {
    console.error("Get studio error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch studio" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ studioId: string }> }
) {
  const auth = requireSuperAdmin(req);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { studioId } = await params;

  try {
    await connectDB();

    const body = await req.json();
    const allowed = [
      "name",
      "ownerName",
      "ownerEmail",
      "phone",
      "address",
      "plan",
      "status",
      "notes",
      "settings",
    ];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    const studio = await Studio.findOneAndUpdate(
      { studioId },
      { $set: update },
      { new: true }
    ).lean();

    if (!studio) {
      return NextResponse.json({ success: false, error: "Studio not found" }, { status: 404 });
    }

    // Log if plan or settings changed
    if (body.plan || body.settings || body.status) {
      await ActivityLog.create({
        studioId,
        type: "settings_updated",
        description: `Studio settings updated by super admin`,
        metadata: { updatedBy: auth.admin.email, changes: body },
      });
    }

    return NextResponse.json({ success: true, data: studio });
  } catch (error) {
    console.error("Update studio error:", error);
    return NextResponse.json({ success: false, error: "Failed to update studio" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ studioId: string }> }
) {
  const auth = requireSuperAdmin(req);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { studioId } = await params;

  try {
    await connectDB();

    const studio = await Studio.findOneAndDelete({ studioId });
    if (!studio) {
      return NextResponse.json({ success: false, error: "Studio not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Studio deleted" });
  } catch (error) {
    console.error("Delete studio error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete studio" }, { status: 500 });
  }
}
