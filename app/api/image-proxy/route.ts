import { NextRequest, NextResponse } from "next/server";

/**
 * Image proxy — fetches a remote image (Bunny CDN, Unsplash, etc.) server-side
 * and re-serves it from our own origin. This lets the browser load the image
 * into a <canvas> without CORS tainting, which face-api needs to read pixels.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400 });
  }

  // Only allow http(s) URLs
  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "MemorablePictures/1.0" },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `upstream returned ${res.status}` },
        { status: 502 }
      );
    }

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/jpeg";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return NextResponse.json({ error: "failed to proxy image" }, { status: 500 });
  }
}
