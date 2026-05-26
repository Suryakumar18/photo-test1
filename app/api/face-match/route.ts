/**
 * POST /api/face-match
 *
 * Two modes — detected from Content-Type:
 *
 * ── Server-side mode (multipart/form-data) ─────────────────────────────────
 *   Fields: selfie (File), eventId (string), sensitivity? (strict|balanced|loose)
 *   • Server runs face-api.js (CPU backend) on the selfie — NO browser ML
 *   • Compares 128-d FaceNet descriptor against stored embeddings
 *   • ~1-2 s total; guest never downloads a 6 MB model
 *
 * ── Browser-fallback mode (application/json) ───────────────────────────────
 *   Body: { descriptor: number[128], eventId, threshold?, sensitivity? }
 *   • Browser already computed the descriptor — just compare server-side
 *   • Works as fallback if server-side selfie processing fails
 *
 * Response:
 *   { success, data: { indexed, matchCount, photos[] } }
 */

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Photo } from "@/models/Photo";
import { FaceEmbedding } from "@/models/FaceEmbedding";
import { Event } from "@/models/Event";
import { signCDNUrl } from "@/lib/bunny";
import { extractSelfieDescriptor } from "@/lib/face-recognition-server";

// ── Thresholds (euclidean distance on 128-d FaceNet) ─────────────────────────
const THRESHOLDS = {
  strict:   0.46,
  balanced: 0.60,
  loose:    0.72,
} as const;
type Sensitivity = keyof typeof THRESHOLDS;

// ── Distance function ─────────────────────────────────────────────────────────
function euclidean(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < 128; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";

    let descriptor: number[];
    let eventId: string;
    let threshold: number;

    if (contentType.includes("multipart/form-data")) {
      // ── Server-side mode: selfie file ──────────────────────────────────────
      const form       = await req.formData();
      const selfieFile = form.get("selfie") as File | null;
      eventId          = (form.get("eventId") as string) ?? "";
      const sensitivity = (form.get("sensitivity") as Sensitivity) ?? "balanced";
      threshold         = THRESHOLDS[sensitivity] ?? THRESHOLDS.balanced;

      if (!selfieFile || !eventId) {
        return NextResponse.json(
          { success: false, error: "selfie (file) and eventId are required" },
          { status: 400 },
        );
      }

      const imageBuffer = Buffer.from(await selfieFile.arrayBuffer());
      const desc        = await extractSelfieDescriptor(imageBuffer);

      if (!desc) {
        return NextResponse.json(
          { success: false, error: "NO_FACE_IN_SELFIE" },
          { status: 422 },
        );
      }

      descriptor = desc;
    } else {
      // ── JSON fallback: browser-computed descriptor ─────────────────────────
      const body = (await req.json()) as {
        descriptor: number[];
        eventId: string;
        threshold?: number;
        sensitivity?: string;
      };

      descriptor = body.descriptor;
      eventId    = body.eventId;
      const sens = (body.sensitivity as Sensitivity) ?? "balanced";
      threshold  = body.threshold ?? THRESHOLDS[sens] ?? THRESHOLDS.balanced;

      if (!eventId || !Array.isArray(descriptor) || descriptor.length !== 128) {
        return NextResponse.json(
          { success: false, error: "eventId and a 128-d descriptor are required" },
          { status: 400 },
        );
      }
    }

    await connectDB();

    // Track usage
    await Event.updateOne({ _id: eventId }, { $inc: { faceMatchCount: 1 } });

    // Load all stored face embeddings for this event
    const embeddings = await FaceEmbedding.find({ eventId })
      .select("photoId embedding")
      .lean();

    if (embeddings.length === 0) {
      return NextResponse.json({
        success: true,
        data: { indexed: false, matchCount: 0, photos: [] },
      });
    }

    // ── Distance comparison ────────────────────────────────────────────────────
    const bestDistPerPhoto = new Map<string, number>();

    for (const emb of embeddings) {
      const photoId = emb.photoId.toString();
      const dist    = euclidean(descriptor, emb.embedding as number[]);
      const prev    = bestDistPerPhoto.get(photoId) ?? Infinity;
      if (dist < prev) bestDistPerPhoto.set(photoId, dist);
    }

    const hits = Array.from(bestDistPerPhoto.entries())
      .filter(([, dist]) => dist <= threshold)
      .sort(([, a], [, b]) => a - b);

    if (hits.length === 0) {
      return NextResponse.json({
        success: true,
        data: { indexed: true, matchCount: 0, photos: [] },
      });
    }

    const hitPhotoIds  = hits.map(([id]) => id);
    const confidenceOf = (dist: number) =>
      Math.round(Math.max(0, Math.min(100, (1 - dist / threshold) * 100)));
    const confidenceMap = new Map(hits.map(([id, dist]) => [id, confidenceOf(dist)]));

    // Fetch full photo records
    const dbPhotos = await Photo.find({ _id: { $in: hitPhotoIds } })
      .select("_id cdnUrl originalName filename size mimeType createdAt hasFaces faceCount")
      .lean();

    // Sort by confidence descending
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
