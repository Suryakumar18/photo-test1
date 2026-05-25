import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Event } from "@/models/Event";
import { Studio } from "@/models/Studio";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    await connectDB();

    const event = await Event.findOne({ slug }).lean<import("@/models/Event").IEvent>();

    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    // Increment view count
    await Event.updateOne({ slug }, { $inc: { viewsCount: 1 } });

    // Fetch studio watermark settings if event has a studioId
    let watermark: { enabled: boolean; url?: string } = { enabled: false };
    if (event.studioId) {
      const studio = await Studio.findOne({ studioId: event.studioId })
        .select("settings logo")   // select whole settings object, not dot-paths
        .lean();
      if (studio) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = studio as any;
        watermark = {
          enabled: !!s.settings?.watermarkEnabled,
          url: s.settings?.watermarkEnabled
            ? (s.settings?.watermark || s.logo)
            : undefined,
        };
      }
    }

    // Return public data (no sensitive info)
    return NextResponse.json({
      success: true,
      data: {
        _id: event._id,
        title: event.title,
        slug: event.slug,
        brideName: event.brideName,
        groomName: event.groomName,
        eventDate: event.eventDate,
        location: event.location,
        coverImageCDN: event.coverImageCDN,
        photosCount: event.photosCount,
        videosCount: event.videosCount,
        status: event.status,
        isPublic: event.isPublic,
        studioId: event.studioId,
        watermark,
      },
    });
  } catch (error) {
    console.error("Get public event error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch event" },
      { status: 500 }
    );
  }
}
