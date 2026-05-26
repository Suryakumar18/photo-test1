import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { FaceEmbedding } from "@/models/FaceEmbedding";
import { Photo } from "@/models/Photo";
import { requireAuth } from "@/lib/auth";

/**
 * POST /api/faces/store
 * Body: { photoId: string, eventId: string, embeddings: number[][] }
 *
 * Called by the admin client after a photo is uploaded:
 * 1. face-api.js detects all faces in the photo (browser, client-side)
 * 2. Returns 128-d descriptor per face
 * 3. Client sends descriptors here to persist in MongoDB
 * 4. At search time the server does fast vector comparison (no browser ML needed)
 */
export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ["admin", "photographer"]);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { photoId, eventId, embeddings } = await req.json() as {
      photoId: string;
      eventId: string;
      embeddings: number[][];
    };

    if (!photoId || !eventId || !Array.isArray(embeddings)) {
      return NextResponse.json(
        { success: false, error: "photoId, eventId and embeddings[] are required" },
        { status: 400 }
      );
    }

    // Validate each embedding is a 128-d float array
    const valid = embeddings.filter(
      (e) => Array.isArray(e) && e.length === 128 && e.every((v) => typeof v === "number")
    );

    await connectDB();

    // Remove previous embeddings for this photo (safe to re-index)
    await FaceEmbedding.deleteMany({ photoId });

    // Store one FaceEmbedding document per detected face
    if (valid.length > 0) {
      await FaceEmbedding.insertMany(
        valid.map((embedding) => ({
          photoId,
          eventId,
          embedding,
          boundingBox: { x: 0, y: 0, width: 0, height: 0 },
          confidence: 1,
        }))
      );
    }

    // Mark photo as indexed
    await Photo.updateOne(
      { _id: photoId },
      { $set: { isProcessed: true, hasFaces: valid.length > 0, faceCount: valid.length } }
    );

    return NextResponse.json({
      success: true,
      data: { facesIndexed: valid.length },
    });
  } catch (error) {
    console.error("Store faces error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to store face embeddings" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/faces/store?eventId=xxx
 * Returns indexing stats for an event (how many photos have been indexed).
 */
export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ["admin", "photographer"]);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const eventId = req.nextUrl.searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ success: false, error: "eventId required" }, { status: 400 });
  }

  await connectDB();

  const [indexedPhotos, totalEmbeddings, totalPhotos] = await Promise.all([
    Photo.countDocuments({ eventId, isProcessed: true }),
    FaceEmbedding.countDocuments({ eventId }),
    Photo.countDocuments({ eventId }),
  ]);

  return NextResponse.json({
    success: true,
    data: { indexedPhotos, totalEmbeddings, totalPhotos },
  });
}
