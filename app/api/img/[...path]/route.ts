import { NextRequest, NextResponse } from "next/server";

const BUNNY_ACCESS_KEY  = "5ab9bc98-798b-44b4-a5f2bc120893-7ebe-41e7";
const BUNNY_STORAGE_ZONE = "testpic";
const BUNNY_STORAGE_HOST = "https://storage.bunnycdn.com";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const filePath = path.join("/");

    const res = await fetch(`${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${filePath}`, {
      headers: { AccessKey: BUNNY_ACCESS_KEY },
    });

    if (!res.ok) {
      return new NextResponse(null, { status: res.status });
    }

    const contentType = res.headers.get("Content-Type") || "image/jpeg";
    const contentLength = res.headers.get("Content-Length");

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    };
    if (contentLength) headers["Content-Length"] = contentLength;

    return new NextResponse(res.body, { headers });
  } catch (err) {
    console.error("Image proxy error:", err);
    return new NextResponse(null, { status: 500 });
  }
}
