import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Favorite } from "@/models/Favorite";
import { Photo } from "@/models/Photo";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { photoId, eventId, sessionId } = await req.json();

    if (!photoId || !eventId || !sessionId) {
      return NextResponse.json(
        { success: false, error: "photoId, eventId, and sessionId are required" },
        { status: 400 }
      );
    }

    const existing = await Favorite.findOne({ sessionId, photoId });

    if (existing) {
      await Favorite.deleteOne({ _id: existing._id });
      await Photo.updateOne({ _id: photoId }, { $inc: { favorites: -1 } });
      return NextResponse.json({
        success: true,
        data: { liked: false },
        message: "Removed from favorites",
      });
    } else {
      await Favorite.create({ sessionId, photoId, eventId });
      await Photo.updateOne({ _id: photoId }, { $inc: { favorites: 1 } });
      return NextResponse.json({
        success: true,
        data: { liked: true },
        message: "Added to favorites",
      });
    }
  } catch (error) {
    console.error("Favorite error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to toggle favorite" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const eventId = searchParams.get("eventId");

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "sessionId is required" }, { status: 400 });
    }

    const query: Record<string, string> = { sessionId };
    if (eventId) query.eventId = eventId;

    const favorites = await Favorite.find(query).lean();
    const photoIds = favorites.map((f) => f.photoId.toString());

    return NextResponse.json({ success: true, data: { photoIds } });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch favorites" }, { status: 500 });
  }
}
