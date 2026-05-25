import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Event } from "@/models/Event";
import { requireAuth } from "@/lib/auth";
import QRCode from "qrcode";
import mongoose from "mongoose";

/**
 * POST /api/events/[slug]/regenerate-qr
 *
 * Re-generates the shareUrl and QR code for an existing event using the
 * actual request host.  Called automatically by the admin event-detail page
 * when it detects that the stored shareUrl points to localhost (i.e. the
 * event was created before the correct URL was being derived from the host).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = requireAuth(req, ["admin"]);
  if ("error" in auth) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status }
    );
  }

  const { slug } = await params;

  try {
    await connectDB();

    // Use the real host — Vercel sets x-forwarded-host for custom domains
    const host =
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const shareUrl = `${protocol}://${host}/event/${slug}`;

    const qrCode = await QRCode.toDataURL(shareUrl, {
      width: 400,
      margin: 2,
      color: { dark: "#1C1C2E", light: "#FFFFFF" },
      errorCorrectionLevel: "H",
    });

    // Accept both MongoDB ObjectId and slug
    const query = mongoose.isValidObjectId(slug) ? { _id: slug } : { slug };
    const event = await Event.findOneAndUpdate(
      query,
      { $set: { shareUrl, qrCode } },
      { new: true }
    ).lean();

    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { shareUrl, qrCode },
      message: "QR code regenerated successfully",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Regenerate QR error:", msg);
    return NextResponse.json(
      { success: false, error: `Failed to regenerate QR: ${msg}` },
      { status: 500 }
    );
  }
}
