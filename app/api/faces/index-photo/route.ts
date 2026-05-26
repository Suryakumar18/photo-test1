/**
 * POST /api/faces/index-photo
 *
 * Server-side face indexing — no browser ML, no Python.
 *
 * 1. Fetches the photo directly from Bunny Storage (AccessKey auth).
 * 2. Runs face-api.js (SSD MobileNet → FaceNet) on the server (CPU backend).
 * 3. Stores 128-d descriptors in MongoDB FaceEmbedding collection.
 *
 * Why server-side is more reliable than browser-side:
 *  • No tab/WebGL memory limits — full-resolution processing
 *  • Consistent Node.js environment — no canvas CORS, no WebGL crashes
 *  • Fire-and-forget from the browser — tab doesn't need to stay open
 */

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { FaceEmbedding } from "@/models/FaceEmbedding";
import { Photo } from "@/models/Photo";
import { requireAuth } from "@/lib/auth";
import { extractDescriptors } from "@/lib/face-recognition-server";

const BUNNY_STORAGE_HOST = process.env.BUNNY_STORAGE_HOST || "https://storage.bunnycdn.com";
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || "testpic";
const BUNNY_ACCESS_KEY   = process.env.BUNNY_ACCESS_KEY   || "";

/** Resolve any cdnUrl variant to a Bunny storage file path. */
function extractFilePath(cdnUrl: string): string {
  if (cdnUrl.startsWith("/api/img/")) return cdnUrl.slice("/api/img/".length);
  try {
    return new URL(cdnUrl).pathname.replace(/^\//, "").split("?")[0];
  } catch {
    return cdnUrl.replace(/^\//, "");
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ["admin", "photographer"]);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  let photoId: string, eventId: string, cdnUrl: string;
  try {
    ({ photoId, eventId, cdnUrl } = await req.json());
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!photoId || !eventId || !cdnUrl) {
    return NextResponse.json(
      { success: false, error: "photoId, eventId and cdnUrl are required" },
      { status: 400 },
    );
  }

  try {
    // 1. Fetch raw bytes from Bunny Storage
    const filePath   = extractFilePath(cdnUrl);
    const storageUrl = `${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${filePath}`;
    const storageRes = await fetch(storageUrl, { headers: { AccessKey: BUNNY_ACCESS_KEY } });

    if (!storageRes.ok) {
      return NextResponse.json(
        { success: false, error: `Storage fetch failed: ${storageRes.status}` },
        { status: 502 },
      );
    }

    const imageBuffer = Buffer.from(await storageRes.arrayBuffer());

    // 2. Run face detection + descriptor extraction (server-side CPU)
    const descriptors = await extractDescriptors(imageBuffer);

    // 3. Persist to MongoDB
    await connectDB();
    await FaceEmbedding.deleteMany({ photoId }); // safe re-index

    if (descriptors.length > 0) {
      await FaceEmbedding.insertMany(
        descriptors.map((embedding) => ({
          photoId,
          eventId,
          embedding,
          modelType: "faceapi",
          boundingBox: { x: 0, y: 0, width: 0, height: 0 },
          confidence: 1,
        })),
      );
    }

    await Photo.updateOne(
      { _id: photoId },
      { $set: { isProcessed: true, hasFaces: descriptors.length > 0, faceCount: descriptors.length } },
    );

    return NextResponse.json({
      success: true,
      data: { facesIndexed: descriptors.length },
    });
  } catch (error) {
    console.error("[index-photo]", error);
    return NextResponse.json({ success: false, error: "Failed to index photo" }, { status: 500 });
  }
}
