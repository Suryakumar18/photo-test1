const BUNNY_ACCESS_KEY =
  process.env.BUNNY_ACCESS_KEY || "cabbf7e8-98df-40d4-85b49ca02d1f-480e-4967";
const BUNNY_STORAGE_ZONE =
  process.env.BUNNY_STORAGE_ZONE || "wowlifestyle123";
const BUNNY_STORAGE_HOST =
  process.env.BUNNY_STORAGE_HOST || "https://storage.bunnycdn.com";
const BUNNY_CDN_URL =
  process.env.BUNNY_CDN_URL || "https://wowlifestyle.b-cdn.net";

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

export function generateSignedUrl(remotePath: string, expiresIn = 3600): string {
  // crypto is a Node.js built-in — safe to use here since this file
  // is only ever imported in server-side API routes (never in client bundles).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto: typeof import("crypto") = require("crypto");
  const tokenKey =
    process.env.BUNNY_TOKEN_KEY || "d92a0d66-cd9c-4915-890c-367c673dc8e0";
  const expirationTime = Math.floor(Date.now() / 1000) + expiresIn;
  const hashableBase = tokenKey + remotePath + expirationTime;

  const token = nodeCrypto
    .createHash("sha256")
    .update(hashableBase)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `${BUNNY_CDN_URL}/${remotePath}?token=${token}&expires=${expirationTime}`;
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
