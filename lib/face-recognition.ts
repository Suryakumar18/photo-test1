"use client";

/**
 * Real face recognition powered by @vladmandic/face-api (TensorFlow.js).
 * Models are served from /public/models. Everything runs in the browser.
 *
 * Pipeline: detect face → 68-point landmarks → 128-d descriptor → euclidean distance.
 */

let faceapi: typeof import("@vladmandic/face-api") | null = null;
let modelsPromise: Promise<void> | null = null;

const MODEL_URL = "/models";

/**
 * Sensitivity levels — map to euclidean-distance thresholds.
 * Lower = stricter (fewer but more accurate matches).
 * Higher = looser (more matches, some false positives).
 */
export const SENSITIVITY = {
  strict:   0.46,   // Precise — only very clear matches
  balanced: 0.60,   // Default — good balance
  loose:    0.72,   // More Matches — catches harder angles/lighting
} as const;

export type SensitivityLevel = keyof typeof SENSITIVITY;

/** Default threshold (balanced). */
export const MATCH_THRESHOLD = SENSITIVITY.balanced;

async function getFaceApi() {
  if (!faceapi) {
    faceapi = await import("@vladmandic/face-api");
  }
  return faceapi;
}

/** Load the 3 model networks once. Safe to call repeatedly. Retries on failure. */
export async function loadModels(): Promise<void> {
  if (modelsPromise) return modelsPromise;
  modelsPromise = (async () => {
    const api = await getFaceApi();
    await Promise.all([
      api.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      api.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      api.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
  })();
  // If loading fails, reset the cached promise so the next call retries from scratch
  // (without this, a transient network error permanently breaks all face detection)
  return modelsPromise.catch((err) => {
    modelsPromise = null;
    throw err;
  });
}

/**
 * Normalise any uploaded file to a JPEG blob so face-api.js always gets
 * a canvas-compatible format.  This handles HEIC/HEIF from iPhones and any
 * other exotic format the browser can display but can't pixel-read directly.
 */
async function normaliseToJpeg(file: File): Promise<File> {
  // Already a safe canvas format — skip the round-trip
  if (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp") {
    return file;
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas  = document.createElement("canvas");
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")?.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(new File([blob], "selfie.jpg", { type: "image/jpeg" }));
          else      reject(new Error("canvas toBlob failed"));
        },
        "image/jpeg",
        0.92,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image load failed")); };
    img.src = url;
  });
}

/** Decode a File / Blob into an <img> element via a local blob URL. */
async function fileToImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

/**
 * Load any image URL into an <img> element, ready for face-api.
 *
 * - Relative paths like /api/img/... are fetched directly (same-origin, no CORS).
 * - Absolute https:// URLs are routed through /api/image-proxy for CORS safety.
 *
 * This is the key fix: previously all URLs went through image-proxy, which
 * rejected relative /api/img/... paths with 400 "invalid url", silently
 * breaking face detection for every photo.
 */
async function urlToImage(url: string): Promise<HTMLImageElement> {
  let fetchUrl: string;

  if (url.startsWith("http://") || url.startsWith("https://")) {
    // Remote CDN URL — proxy for CORS canvas safety
    fetchUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`;
  } else {
    // Already a same-origin relative path (/api/img/...) — fetch directly
    fetchUrl = url;
  }

  const res = await fetch(fetchUrl);
  if (!res.ok) throw new Error(`image fetch failed: ${res.status} ${fetchUrl}`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const img = new Image();
  img.src = objectUrl;
  await img.decode();
  return img;
}

/** Compute a single 128-d face descriptor from an uploaded selfie. */
export async function getSelfieDescriptor(file: File): Promise<Float32Array | null> {
  await loadModels();
  const api        = await getFaceApi();
  const safeFile   = await normaliseToJpeg(file);   // converts HEIC / exotic formats
  const img        = await fileToImage(safeFile);
  try {
    const detection = await api
      // 0.2 threshold mirrors the photo-indexing scan — catches selfies in varied lighting
      .detectSingleFace(img, new api.SsdMobilenetv1Options({ minConfidence: 0.2 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    return detection ? detection.descriptor : null;
  } finally {
    if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
  }
}

/** Compute descriptors for every face found in a remote/proxy photo. */
export async function getPhotoDescriptors(url: string): Promise<Float32Array[]> {
  await loadModels();
  const api = await getFaceApi();
  const img = await urlToImage(url);
  try {
    const detections = await api
      // 0.2 threshold catches more small faces in group/crowd photos
      .detectAllFaces(img, new api.SsdMobilenetv1Options({ minConfidence: 0.2 }))
      .withFaceLandmarks()
      .withFaceDescriptors();
    return detections.map((d) => d.descriptor);
  } finally {
    if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
  }
}

/** Euclidean distance between two descriptors. Smaller = more similar. */
export function euclideanDistance(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export interface MatchResult<T> {
  photo: T;
  distance: number;
  confidence: number; // 0-100
}

/** Thrown when no face is found in the user's selfie. */
export class NoFaceError extends Error {
  constructor() {
    super("NO_FACE_IN_SELFIE");
    this.name = "NoFaceError";
  }
}

/**
 * Match a selfie against a list of photos.
 * Processes photos one-by-one and reports progress so the UI can animate.
 *
 * @param selfie       The selfie File object
 * @param photos       Array of photos with cdnUrl (may be /api/img/... or https://...)
 * @param onProgress   Optional progress callback
 * @param threshold    Euclidean distance cutoff (use SENSITIVITY.* constants)
 */
export async function matchSelfieToPhotos<T extends { cdnUrl: string }>(
  selfie: File,
  photos: T[],
  onProgress?: (done: number, total: number, matchesSoFar: number) => void,
  threshold: number = MATCH_THRESHOLD,
): Promise<MatchResult<T>[]> {
  const selfieDescriptor = await getSelfieDescriptor(selfie);
  if (!selfieDescriptor) {
    throw new NoFaceError();
  }

  const matches: MatchResult<T>[] = [];

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    try {
      const descriptors = await getPhotoDescriptors(photo.cdnUrl);
      let best = Infinity;
      for (const d of descriptors) {
        const dist = euclideanDistance(selfieDescriptor, d);
        if (dist < best) best = dist;
      }
      if (best <= threshold) {
        // Map distance (0..1) → confidence percentage
        const confidence = Math.round(Math.max(0, Math.min(100, (1 - best) * 100)));
        matches.push({ photo, distance: best, confidence });
      }
    } catch {
      // A single photo failing to load shouldn't abort the whole scan
    }
    onProgress?.(i + 1, photos.length, matches.length);
  }

  matches.sort((a, b) => a.distance - b.distance);
  return matches;
}
