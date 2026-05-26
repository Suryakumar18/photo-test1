/**
 * POST /api/face-match
 *
 * Body (JSON):
 *   { descriptor: number[128], eventId: string, threshold?: number }
 *
 * The 128-d FaceNet descriptor is computed in the browser by face-api.js
 * (lib/face-recognition.ts → getSelfieDescriptor).
 * The server does the vector comparison against stored FaceEmbedding documents.
 *
 * Returns:
 *   { success, data: { indexed, matchCount, photos[] } }
 */

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Photo } from "@/models/Photo";
import { FaceEmbedding } from "@/models/FaceEmbedding";
import { Event } from "@/models/Event";
import { signCDNUrl } from "@/lib/bunny";

// ── Euclidean distance on 128-d FaceNet descriptors ───────────────────────────
function euclidean(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < 128; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

// Sensitivity → euclidean distance threshold
const THRESHOLDS = { strict: 0.46, balanced: 0.60, loose: 0.72 } as const;
type Sensitivity = keyof typeof THRESHOLDS;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      descriptor: number[];
      eventId: string;
      threshold?: number;
      sensitivity?: string;
    };

    const { descriptor, eventId } = body;
    const sensitivity = (body.sensitivity as Sensitivity) ?? "balanced";
    const threshold   = body.threshold ?? THRESHOLDS[sensitivity] ?? THRESHOLDS.balanced;

    if (!eventId || !Array.isArray(descriptor) || descriptor.length !== 128) {
      return NextResponse.json(
        { success: false, error: "eventId and a 128-d descriptor are required" },
        { status: 400 },
      );
    }

    await connectDB();

    // Track usage
    await Event.updateOne({ _id: eventId }, { $inc: { faceMatchCount: 1 } });

    // Load all stored embeddings for this event
    const embeddings = await FaceEmbedding.find({ eventId })
      .select("photoId embedding")
      .lean();

    if (embeddings.length === 0) {
      return NextResponse.json({
        success: true,
        data: { indexed: false, matchCount: 0, photos: [] },
      });
    }

    // Per-photo best distance
    const bestDistPerPhoto = new Map<string, number>();
    for (const emb of embeddings) {
      const photoId = emb.photoId.toString();
      const dist    = euclidean(descriptor, emb.embedding as number[]);
      const prev    = bestDistPerPhoto.get(photoId) ?? Infinity;
      if (dist < prev) bestDistPerPhoto.set(photoId, dist);
    }

    // Filter and sort
    const hits = Array.from(bestDistPerPhoto.entries())
      .filter(([, dist]) => dist <= threshold)
      .sort(([, a], [, b]) => a - b);

    if (hits.length === 0) {
      return NextResponse.json({
        success: true,
        data: { indexed: true, matchCount: 0, photos: [] },
      });
    }

    const hitPhotoIds   = hits.map(([id]) => id);
    const confidenceOf  = (dist: number) =>
      Math.round(Math.max(0, Math.min(100, (1 - dist / threshold) * 100)));
    const confidenceMap = new Map(hits.map(([id, dist]) => [id, confidenceOf(dist)]));

    const dbPhotos = await Photo.find({ _id: { $in: hitPhotoIds } })
      .select("_id cdnUrl originalName filename size mimeType createdAt hasFaces faceCount")
      .lean();

    (dbPhotos as any[]).sort(
      (a, b) =>
        (confidenceMap.get(String(b._id)) ?? 0) -
        (confidenceMap.get(String(a._id)) ?? 0),
    );

    return NextResponse.json({
      success: true,
      data: {
        indexed: true,
        matchCount: dbPhotos.length,
        photos: (dbPhotos as any[]).map((p) => ({
          ...p,
          cdnUrl:     signCDNUrl(p.cdnUrl),
          confidence: confidenceMap.get(p._id.toString()) ?? 0,
        })),
      },
    });
  } catch (error) {
    console.error("[face-match]", error);
    return NextResponse.json(
      { success: false, error: "Face matching failed" },
      { status: 500 },
    );
  }
}
