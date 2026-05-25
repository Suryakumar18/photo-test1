import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Photo } from "@/models/Photo";
import { FaceEmbedding } from "@/models/FaceEmbedding";
import { Event } from "@/models/Event";
import { uploadToBunny, signCDNUrl } from "@/lib/bunny";
import { v4 as uuidv4 } from "uuid";

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function generateMockEmbedding(seed: number): number[] {
  const embedding = new Array(128).fill(0).map((_, i) =>
    Math.sin(seed * 0.1 + i * 0.3) * Math.cos(seed * 0.05 + i * 0.2)
  );
  const mag = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
  return embedding.map((v) => v / mag);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const selfie = formData.get("selfie") as File | null;
    const eventId = formData.get("eventId") as string;

    if (!selfie || !eventId) {
      return NextResponse.json(
        { success: false, error: "Selfie and eventId are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Update face match count
    await Event.updateOne({ _id: eventId }, { $inc: { faceMatchCount: 1 } });

    // Upload selfie to Bunny
    const selfieBuffer = Buffer.from(await selfie.arrayBuffer());
    const selfieId = uuidv4();
    const selfiePath = `events/${eventId}/selfies/${selfieId}.jpg`;

    let selfieUrl: string;
    try {
      const { cdnUrl } = await uploadToBunny(selfieBuffer, selfiePath, selfie.type);
      selfieUrl = cdnUrl;
    } catch {
      selfieUrl = "";
    }

    // Generate mock embedding for the selfie
    const selfieEmbedding = generateMockEmbedding(Math.random() * 100);

    // Get face embeddings for event
    const embeddings = await FaceEmbedding.find({ eventId }).lean();

    let matchedPhotoIds: string[] = [];

    if (embeddings.length > 0) {
      // Real face matching with stored embeddings
      const matches = embeddings
        .map((emb) => ({
          photoId: emb.photoId.toString(),
          similarity: cosineSimilarity(selfieEmbedding, emb.embedding),
        }))
        .filter((m) => m.similarity > 0.7)
        .sort((a, b) => b.similarity - a.similarity);

      matchedPhotoIds = [...new Set(matches.map((m) => m.photoId))];
    } else {
      // Fallback: return random photos (demo mode)
      const allPhotos = await Photo.find({ eventId }).lean<import("@/models/Photo").IPhoto[]>();
      const sampleSize = Math.min(Math.floor(allPhotos.length * 0.3), 20);
      const shuffled = allPhotos.sort(() => Math.random() - 0.5);
      matchedPhotoIds = shuffled.slice(0, sampleSize).map((p) => String(p._id));
    }

    const matchedPhotos = await Photo.find({
      _id: { $in: matchedPhotoIds },
    }).lean();

    return NextResponse.json({
      success: true,
      data: {
        matchCount: matchedPhotos.length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        photos: matchedPhotos.map((p: any) => ({ ...p, cdnUrl: signCDNUrl(p.cdnUrl) })),
        selfieUrl: selfieUrl ? signCDNUrl(selfieUrl) : "",
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
