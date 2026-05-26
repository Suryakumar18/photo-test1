import { NextRequest, NextResponse } from "next/server";

const BUNNY_ACCESS_KEY  = "5ab9bc98-798b-44b4-a5f2bc120893-7ebe-41e7";
const BUNNY_STORAGE_ZONE = "testpic";
const BUNNY_CDN_URL      = "https://testphotography.b-cdn.net";
const BUNNY_STORAGE_HOST = "https://storage.bunnycdn.com";

/**
 * Image proxy — fetches a remote image server-side and re-serves it from our
 * own origin. Used by face-api so <canvas> can read pixels without CORS tainting.
 *
 * For our own Bunny files it fetches from storage (AccessKey) not the CDN pull
 * zone, so token-auth 403s never occur.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400 });
  }

  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  try {
    let fetchUrl = url;
    const fetchHeaders: Record<string, string> = { "User-Agent": "MemorablePictures/1.0" };

    // If this is one of our own Bunny CDN URLs, re-route to storage so we
    // bypass CDN token authentication entirely.
    if (url.startsWith(BUNNY_CDN_URL)) {
      const relativePath = url.replace(`${BUNNY_CDN_URL}/`, "").split("?")[0];
      fetchUrl = `${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${relativePath}`;
      fetchHeaders["AccessKey"] = BUNNY_ACCESS_KEY;
    }

    const res = await fetch(fetchUrl, { headers: fetchHeaders });

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
