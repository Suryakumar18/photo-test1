import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Photo } from "@/models/Photo";
import { Event } from "@/models/Event";
import { requireAuth } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req, ["admin", "photographer"]);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    await connectDB();

    const photo = await Photo.findById(id);
    if (!photo) {
      return NextResponse.json({ success: false, error: "Photo not found" }, { status: 404 });
    }

    // Decrement event counts
    await Event.updateOne(
      { _id: photo.eventId },
      { $inc: { photosCount: -1, storageUsed: -photo.size } }
    );

    await Photo.deleteOne({ _id: id });

    return NextResponse.json({ success: true, message: "Photo deleted" });
  } catch (error) {
    console.error("Delete photo error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete photo" }, { status: 500 });
  }
}
