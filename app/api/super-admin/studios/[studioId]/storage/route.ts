import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Studio } from "@/models/Studio";
import { ActivityLog } from "@/models/ActivityLog";
import { requireSuperAdmin } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ studioId: string }> }) {
  const auth = requireSuperAdmin(req);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { studioId } = await params;

  try {
    await connectDB();

    const { storageLimit } = await req.json();

    if (typeof storageLimit !== "number" || storageLimit <= 0) {
      return NextResponse.json(
        { success: false, error: "storageLimit must be a positive number (bytes)" },
        { status: 400 }
      );
    }

    const studio = await Studio.findOneAndUpdate(
      { studioId },
      { $set: { storageLimit } },
      { new: true }
    ).lean();

    if (!studio) {
      return NextResponse.json({ success: false, error: "Studio not found" }, { status: 404 });
    }

    await ActivityLog.create({
      studioId,
      type: "storage_limit_set",
      description: `Storage limit set to ${(storageLimit / (1024 * 1024 * 1024)).toFixed(2)} GB by super admin`,
      metadata: { storageLimit, setBy: auth.admin.email },
    });

    const s = studio as unknown as { storageUsed: number };
    return NextResponse.json({
      success: true,
      data: { studioId, storageLimit, storageUsed: s.storageUsed },
    });
  } catch (error) {
    console.error("Set storage limit error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to set storage limit" },
      { status: 500 }
    );
  }
}
