const BUNNY_ACCESS_KEY =
  process.env.BUNNY_ACCESS_KEY || "5ab9bc98-798b-44b4-a5f2bc120893-7ebe-41e7";
const BUNNY_STORAGE_ZONE =
  process.env.BUNNY_STORAGE_ZONE || "testpic";
const BUNNY_STORAGE_HOST =
  process.env.BUNNY_STORAGE_HOST || "https://storage.bunnycdn.com";
const BUNNY_CDN_URL =
  process.env.BUNNY_CDN_URL || "https://testphotography.b-cdn.net";

export const bunnyConfig = {
  accessKey: BUNNY_ACCESS_KEY,
  storageZone: BUNNY_STORAGE_ZONE,
  storageHost: BUNNY_STORAGE_HOST,
  cdnUrl: BUNNY_CDN_URL,
};

export async function uploadToBunny(
  buffer: Buffer,
  remotePath: string,
  contentType: string = "application/octet-stream"
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

  const cdnUrl = `${BUNNY_CDN_URL}/${remotePath}`;
  return { url, cdnUrl };
}

export async function deleteFromBunny(remotePath: string): Promise<boolean> {
  const url = `${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${remotePath}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      AccessKey: BUNNY_ACCESS_KEY,
    },
  });

  return response.ok;
}

export async function listBunnyFiles(folderPath: string): Promise<BunnyFile[]> {
  const url = `${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${folderPath}/`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      AccessKey: BUNNY_ACCESS_KEY,
    },
  });

  if (!response.ok) {
    return [];
  }

  const files = await response.json();
  return files;
}

export function getBunnyCDNUrl(remotePath: string): string {
  return `${BUNNY_CDN_URL}/${remotePath}`;
}

export function getEventStoragePath(
  eventId: string,
  type: "photos" | "videos" | "covers" = "photos"
): string {
  return `events/${eventId}/${type}`;
}

export function generateSignedUrl(remotePath: string, expiresIn = 86400): string {
  // crypto is a Node.js built-in — safe to use here since this file
  // is only ever imported in server-side API routes (never in client bundles).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto: typeof import("crypto") = require("crypto");
  const tokenKey =
    process.env.BUNNY_TOKEN_KEY || "def0d8b8-7493-4257-8efd-62a0a8f136c7";
  const expirationTime = Math.floor(Date.now() / 1000) + expiresIn;

  // Bunny CDN requires the path to start with "/" in the hash input
  const pathForHash = remotePath.startsWith("/") ? remotePath : `/${remotePath}`;
  const hashableBase = tokenKey + pathForHash + expirationTime;

  const token = nodeCrypto
    .createHash("sha256")
    .update(hashableBase)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  // Strip any leading slash from remotePath for the final URL
  const cleanPath = remotePath.replace(/^\//, "");
  return `${BUNNY_CDN_URL}/${cleanPath}?token=${token}&expires=${expirationTime}`;
}

/**
 * Sign a full CDN URL or a bare relative path.
 * Pass any cdnUrl straight from the DB and get back a URL that works
 * even when Token Authentication is enabled on the Bunny pull zone.
 * Safe to call when token auth is disabled — Bunny simply ignores the params.
 */
export function signCDNUrl(urlOrPath: string, expiresIn = 86400): string {
  if (!urlOrPath) return urlOrPath;
  // Convert full URL → relative path, stripping any existing query string
  const relativePath = urlOrPath.startsWith("http")
    ? urlOrPath.replace(`${BUNNY_CDN_URL}/`, "").split("?")[0]
    : urlOrPath.replace(/^\//, "").split("?")[0];
  return generateSignedUrl(relativePath, expiresIn);
}

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
