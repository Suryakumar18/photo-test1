import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Photo } from "@/models/Photo";
import { Event } from "@/models/Event";
import { Studio } from "@/models/Studio";
import { requireAuth } from "@/lib/auth";
import { uploadToBunny, getEventStoragePath } from "@/lib/bunny";
import { v4 as uuidv4 } from "uuid";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/avi"];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ["admin", "photographer"]);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const eventId = formData.get("eventId") as string;

    if (!file || !eventId) {
      return NextResponse.json(
        { success: false, error: "File and eventId are required" },
        { status: 400 }
      );
    }

    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { success: false, error: `File type ${file.type} not supported` },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "File size exceeds 50MB limit" },
        { status: 400 }
      );
    }

    await connectDB();

    const fileId = uuidv4();
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${fileId}.${ext}`;
    const storagePath = `${getEventStoragePath(eventId, isImage ? "photos" : "videos")}/${filename}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { cdnUrl } = await uploadToBunny(buffer, storagePath, file.type);

    // Save to database — always tag with studioId so super admin can scope queries
    const photo = await Photo.create({
      eventId,
      studioId: auth.user.studioId || undefined,
      filename,
      originalName: file.name,
      storagePath,
      cdnUrl,
      size: file.size,
      mimeType: file.type,
      uploadedBy: auth.user.userId,
      isProcessed: false,
      hasFaces: false,
      faceCount: 0,
    });

    // Update event counts and storage
    await Event.updateOne(
      { _id: eventId },
      {
        $inc: {
          [isImage ? "photosCount" : "videosCount"]: 1,
          storageUsed: file.size,
        },
      }
    );

    // Update studio-level storage and photo count so super admin sees real usage
    if (auth.user.studioId) {
      await Studio.updateOne(
        { studioId: auth.user.studioId },
        {
          $inc: {
            storageUsed: file.size,
            [isImage ? "photosCount" : "videosCount"]: 1,
          },
          $set: { lastActivity: new Date() },
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        photoId: photo._id.toString(),
        filename,
        cdnUrl,
        size: file.size,
      },
      message: "File uploaded successfully",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "Upload failed" },
      { status: 500 }
    );
  }
}
