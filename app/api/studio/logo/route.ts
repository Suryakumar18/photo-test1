import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Studio } from "@/models/Studio";
import { requireAuth } from "@/lib/auth";
import { uploadToBunny, signCDNUrl } from "@/lib/bunny";
import { v4 as uuidv4 } from "uuid";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

// ── POST /api/studio/logo ─────────────────────────────────────────────────
// Uploads studio logo to Bunny CDN and saves the URL to Studio.logo.
// Only admin role can change the studio logo.
export async function POST(req: NextRequest) {
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

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Only JPEG, PNG, WebP, or SVG images are allowed" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "Logo must be smaller than 5 MB" },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() || "png";
    const filename = `logo-${uuidv4().slice(0, 8)}.${ext}`;
    const remotePath = `studios/${auth.user.studioId}/logos/${filename}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { cdnUrl } = await uploadToBunny(buffer, remotePath, file.type);

    await connectDB();

    await Studio.updateOne(
      { studioId: auth.user.studioId },
      {
        $set: {
          logo: cdnUrl,
          // If watermark was using the old logo URL, update it too
          "settings.watermark": cdnUrl,
        },
      }
    );

    return NextResponse.json({ success: true, data: { logoUrl: signCDNUrl(cdnUrl) } });
  } catch (error) {
    console.error("Logo upload error:", error);
    return NextResponse.json({ success: false, error: "Logo upload failed" }, { status: 500 });
  }
}
