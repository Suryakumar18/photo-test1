import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Photo } from "@/models/Photo";
import { FaceEmbedding } from "@/models/FaceEmbedding";
import { Event } from "@/models/Event";
import { signCDNUrl } from "@/lib/bunny";

/**
 * Euclidean distance between two 128-d face descriptors.
 * This matches the metric used by face-api.js / FaceNet.
 * Range 0–2; threshold ≤ 0.6 is a reliable match.
 */
function euclidean(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < 128; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/**
 * POST /api/face-match
 * Body (JSON): {
 *   descriptor : number[]   — 128-d face descriptor computed by face-api.js in the browser
 *   eventId    : string
 *   threshold? : number     — euclidean distance cut-off (default 0.60)
 * }
 *
 * Returns photos that contain a face within `threshold` distance of the selfie.
 * Because embeddings are pre-indexed, this runs in milliseconds even for 10,000+ faces.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      descriptor: number[];
      eventId: string;
      threshold?: number;
    };

    const { descriptor, eventId, threshold = 0.6 } = body;

    if (
      !eventId ||
      !Array.isArray(descriptor) ||
      descriptor.length !== 128
    ) {
      return NextResponse.json(
        { success: false, error: "eventId and a 128-d descriptor are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Track usage
    await Event.updateOne({ _id: eventId }, { $inc: { faceMatchCount: 1 } });

    // Load all stored face embeddings for this event
    const embeddings = await FaceEmbedding.find({ eventId })
      .select("photoId embedding")
      .lean();

    if (embeddings.length === 0) {
      // No index built yet — tell the client so it can show a helpful message
      return NextResponse.json({
        success: true,
        data: {
          indexed: false,
          matchCount: 0,
          photos: [],
        },
      });
    }

    // For each unique photo, find the closest face to the selfie descriptor.
    // Using a plain Map is fast: 15,000 embeddings × 128 ops ≈ < 5ms in Node.js.
    const bestDistPerPhoto = new Map<string, number>();

    for (const emb of embeddings) {
      const photoId = emb.photoId.toString();
      const dist = euclidean(descriptor, emb.embedding as number[]);
      const prev = bestDistPerPhoto.get(photoId) ?? Infinity;
      if (dist < prev) bestDistPerPhoto.set(photoId, dist);
    }

    // Filter and sort by distance ascending
    const hits = Array.from(bestDistPerPhoto.entries())
      .filter(([, dist]) => dist <= threshold)
      .sort(([, a], [, b]) => a - b);

    if (hits.length === 0) {
      return NextResponse.json({
        success: true,
        data: { indexed: true, matchCount: 0, photos: [] },
      });
    }

    const hitPhotoIds = hits.map(([id]) => id);

    // Map distance → confidence score (0-100).  Distance 0 = 100 %, distance 0.6 = ~40 %.
    const confidenceOf = (dist: number) =>
      Math.round(Math.max(0, Math.min(100, (1 - dist / threshold) * 100)));

    const confidenceMap = new Map(
      hits.map(([id, dist]) => [id, confidenceOf(dist)])
    );

    // Fetch photo records
    const dbPhotos = await Photo.find({ _id: { $in: hitPhotoIds } })
      .select("_id cdnUrl originalName filename size mimeType createdAt hasFaces faceCount")
      .lean();

    // Sort by confidence descending
    dbPhotos.sort(
      (a, b) =>
        (confidenceMap.get(b._id.toString()) ?? 0) -
        (confidenceMap.get(a._id.toString()) ?? 0)
    );

    return NextResponse.json({
      success: true,
      data: {
        indexed: true,
        matchCount: dbPhotos.length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        photos: dbPhotos.map((p: any) => ({
          ...p,
          cdnUrl: signCDNUrl(p.cdnUrl),
          confidence: confidenceMap.get(p._id.toString()) ?? 0,
        })),
      },
    });
  } catch (error) {
    console.error("Face match error:", error);
    return NextResponse.json(
      { success: false, error: "Face matching failed" },
      { status: 500 }
    );
  }
}
