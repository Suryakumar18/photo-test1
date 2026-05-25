import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Studio } from "@/models/Studio";
import { ActivityLog } from "@/models/ActivityLog";
import { requireSuperAdmin } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ studioId: string }> }) {
  const auth = requireSuperAdmin(req);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { studioId } = await params;

  try {
    await connectDB();

    const studio = await Studio.findOne({ studioId });
    if (!studio) {
      return NextResponse.json({ success: false, error: "Studio not found" }, { status: 404 });
    }

    const isSuspended = studio.status === "suspended";
    const newStatus = isSuspended ? "active" : "suspended";

    await Studio.updateOne({ studioId }, { $set: { status: newStatus } });

    await ActivityLog.create({
      studioId,
      type: isSuspended ? "studio_activated" : "studio_suspended",
      description: `Studio "${studio.name}" ${isSuspended ? "activated" : "suspended"} by super admin`,
      metadata: { action: isSuspended ? "activate" : "suspend", by: auth.admin.email },
    });

    return NextResponse.json({
      success: true,
      data: { studioId, status: newStatus, message: `Studio ${newStatus}` },
    });
  } catch (error) {
    console.error("Suspend studio error:", error);
    return NextResponse.json({ success: false, error: "Failed to update status" }, { status: 500 });
  }
}
