import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Studio } from "@/models/Studio";
import { requireAuth } from "@/lib/auth";
import { signCDNUrl } from "@/lib/bunny";

// ── GET /api/studio/settings ───────────────────────────────────────────────
// Returns the calling studio-admin's studio settings.
export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ["admin", "photographer"]);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (!auth.user.studioId) {
    return NextResponse.json(
      { success: false, error: "No studio linked to this account" },
      { status: 400 }
    );
  }

  await connectDB();

  const studio = await Studio.findOne({ studioId: auth.user.studioId }).select(
    "studioId name ownerName ownerEmail phone address logo settings plan status storageLimit storageUsed"
  );

  if (!studio) {
    return NextResponse.json({ success: false, error: "Studio not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = studio.toObject ? studio.toObject() : (studio as any);
  return NextResponse.json({
    success: true,
    data: { ...s, logo: s.logo ? signCDNUrl(s.logo) : s.logo },
  });
}

// ── PATCH /api/studio/settings ────────────────────────────────────────────
// Only admin (not photographer) can update studio-level settings.
export async function PATCH(req: NextRequest) {
  const auth = requireAuth(req, ["admin"]);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  if (!auth.user.studioId) {
    return NextResponse.json(
      { success: false, error: "No studio linked to this account" },
      { status: 400 }
    );
  }

  await connectDB();

  const body = await req.json();

  // Build a safe update object — only allow specific fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {};

  if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();
  if (typeof body.phone === "string") update.phone = body.phone.trim();
  if (typeof body.address === "string") update.address = body.address.trim();
  if (typeof body.logo === "string") update.logo = body.logo;

  // Studio settings sub-fields
  if (typeof body.watermarkEnabled === "boolean")
    update["settings.watermarkEnabled"] = body.watermarkEnabled;
  if (typeof body.watermark === "string") update["settings.watermark"] = body.watermark;
  if (typeof body.allowFaceMatch === "boolean")
    update["settings.allowFaceMatch"] = body.allowFaceMatch;
  if (typeof body.allowPublicGallery === "boolean")
    update["settings.allowPublicGallery"] = body.allowPublicGallery;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ success: false, error: "No valid fields to update" }, { status: 400 });
  }

  const updated = await Studio.findOneAndUpdate(
    { studioId: auth.user.studioId },
    { $set: update },
    { new: true }
  ).select("studioId name ownerName phone address logo settings plan status storageLimit storageUsed");

  if (!updated) {
    return NextResponse.json({ success: false, error: "Studio not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: updated });
}
