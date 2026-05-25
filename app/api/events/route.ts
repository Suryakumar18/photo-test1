import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Event } from "@/models/Event";
import { requireAuth } from "@/lib/auth";
import { generateEventSlug, getEventShareUrl } from "@/lib/utils";
import { uploadToBunny, getEventStoragePath } from "@/lib/bunny";
import QRCode from "qrcode";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ["admin", "photographer"]);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const query: Record<string, unknown> = {};
    // Scope to studio — admins/photographers only see their own studio's events
    if (auth.user.studioId) query.studioId = auth.user.studioId;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { brideName: { $regex: search, $options: "i" } },
        { groomName: { $regex: search, $options: "i" } },
      ];
    }
    if (status) query.status = status;

    const total = await Event.countDocuments(query);
    const events = await Event.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        events,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error("Get events error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ["admin"]);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    await connectDB();

    const formData = await req.formData();
    const title = formData.get("title") as string;
    const brideName = formData.get("brideName") as string;
    const groomName = formData.get("groomName") as string;
    const eventDate = formData.get("eventDate") as string;
    const location = formData.get("location") as string;
    const description = formData.get("description") as string;
    const coverFile = formData.get("cover") as File | null;

    if (!title || !brideName || !groomName || !eventDate || !location) {
      return NextResponse.json(
        { success: false, error: "Required fields are missing" },
        { status: 400 }
      );
    }

    const slug = generateEventSlug(brideName, groomName, new Date(eventDate));
    const shareUrl = getEventShareUrl(slug);

    // Generate QR code
    const qrCode = await QRCode.toDataURL(shareUrl, {
      width: 400,
      margin: 2,
      color: { dark: "#1C1C2E", light: "#FFFFFF" },
      errorCorrectionLevel: "H",
    });

    let coverImageCDN: string | undefined;

    // Upload cover image if provided
    if (coverFile) {
      const buffer = Buffer.from(await coverFile.arrayBuffer());
      // Correct path: covers/{slug}-cover.jpg
      const storagePath = `covers/${slug}-cover.jpg`;
      try {
        const { cdnUrl } = await uploadToBunny(buffer, storagePath, coverFile.type);
        coverImageCDN = cdnUrl;
      } catch (err) {
        console.error("Cover upload failed (non-fatal):", err);
      }
    }

    const event = await Event.create({
      title,
      slug,
      brideName,
      groomName,
      eventDate: new Date(eventDate),
      location,
      description: description || "",
      coverImageCDN,
      shareUrl,
      qrCode,
      status: "upcoming",
      studioId: auth.user.studioId || undefined, // scope to studio
      createdBy: auth.user.userId,   // Mixed type — accepts "admin-000" or any ObjectId
    });

    return NextResponse.json({
      success: true,
      data: {
        _id: event._id.toString(),
        title: event.title,
        slug: event.slug,
        shareUrl: event.shareUrl,
        qrCode: event.qrCode,
        status: event.status,
      },
      message: "Event created successfully",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Create event error:", msg);
    return NextResponse.json(
      { success: false, error: `Failed to create event: ${msg}` },
      { status: 500 }
    );
  }
}
