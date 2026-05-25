// ─── Hardcoded Bunny credentials ─────────────────────────────────────────────
// All values are hardcoded so they work even without Vercel env vars.
const BUNNY_ACCESS_KEY  = "5ab9bc98-798b-44b4-a5f2bc120893-7ebe-41e7";
const BUNNY_STORAGE_ZONE = "testpic";
const BUNNY_STORAGE_HOST = "https://storage.bunnycdn.com";
const BUNNY_CDN_URL      = "https://testphotography.b-cdn.net";
const BUNNY_TOKEN_KEY    = "def0d8b8-7493-4257-8efd-62a0a8f136c7";

export const bunnyConfig = {
  accessKey:   BUNNY_ACCESS_KEY,
  storageZone: BUNNY_STORAGE_ZONE,
  storageHost: BUNNY_STORAGE_HOST,
  cdnUrl:      BUNNY_CDN_URL,
};

// ─── Upload ───────────────────────────────────────────────────────────────────

export async function uploadToBunny(
  buffer: Buffer,
  remotePath: string,
  contentType = "application/octet-stream"
): Promise<{ url: string; cdnUrl: string }> {
  const url = `${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${remotePath}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      AccessKey: BUNNY_ACCESS_KEY,
      "Content-Type": contentType,
      "Content-Length": buffer.length.toString(),
    },
    body: buffer as unknown as BodyInit,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Bunny upload failed: ${response.status} ${errorText}`);
  }

  return { url, cdnUrl: `${BUNNY_CDN_URL}/${remotePath}` };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteFromBunny(remotePath: string): Promise<boolean> {
  const res = await fetch(`${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${remotePath}`, {
    method: "DELETE",
    headers: { AccessKey: BUNNY_ACCESS_KEY },
  });
  return res.ok;
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listBunnyFiles(folderPath: string): Promise<BunnyFile[]> {
  const res = await fetch(`${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${folderPath}/`, {
    headers: { AccessKey: BUNNY_ACCESS_KEY },
  });
  if (!res.ok) return [];
  return res.json();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getBunnyCDNUrl(remotePath: string): string {
  return `${BUNNY_CDN_URL}/${remotePath}`;
}

export function getEventStoragePath(
  eventId: string,
  type: "photos" | "videos" | "covers" = "photos"
): string {
  return `events/${eventId}/${type}`;
}

// ─── Token signing ────────────────────────────────────────────────────────────
// Bunny CDN formula: Base64URL( SHA256( tokenKey + "/" + filePath + expires ) )
// filePath starts with "/" e.g. "/events/abc/photo.jpg"

export function generateSignedUrl(remotePath: string, expiresIn = 86400): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto") as typeof import("crypto");

  const expires = Math.floor(Date.now() / 1000) + expiresIn;

  // Path must start with "/" for the hash
  const filePath = remotePath.startsWith("/") ? remotePath : `/${remotePath}`;

  // Concatenate exactly as Bunny expects: key + path + expires (all as strings)
  const toSign = BUNNY_TOKEN_KEY + filePath + String(expires);

  const token = crypto
    .createHash("sha256")
    .update(toSign, "utf8")
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  // Build the final URL (path without leading slash)
  const urlPath = remotePath.replace(/^\//, "");
  return `${BUNNY_CDN_URL}/${urlPath}?token=${token}&expires=${expires}`;
}

/**
 * Returns a proxy URL through /api/img/... so images are served via the
 * Next.js API route (which uses the Bunny storage AccessKey) instead of
 * the CDN pull zone.  This completely bypasses CDN token-auth 403 errors.
 *
 * Works whether the input is a full https://… CDN URL or a bare relative path.
 */
export function signCDNUrl(urlOrPath: string): string {
  if (!urlOrPath) return urlOrPath;

  // Strip the CDN base URL and any existing query string to get a clean relative path
  const relativePath = urlOrPath.startsWith("http")
    ? urlOrPath.replace(`${BUNNY_CDN_URL}/`, "").split("?")[0]
    : urlOrPath.replace(/^\//, "").split("?")[0];

  return `/api/img/${relativePath}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BunnyFile {
  Guid: string;
  StorageZoneName: string;
  Path: string;
  ObjectName: string;
  Length: number;
  LastChanged: string;
  ServerId: number;
  ArrayNumber: number;
  IsDirectory: boolean;
  UserId: string;
  ContentType: string;
  DateCreated: string;
  StorageZoneId: number;
  Checksum: string;
}
