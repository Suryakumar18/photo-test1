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
 * Euclidean-distance threshold for a match. face-api's own default is 0.6.
 * 0.55 is a good balance — strict enough to avoid false positives,
 * loose enough to catch the same person across different photos.
 */
export const MATCH_THRESHOLD = 0.55;

async function getFaceApi() {
  if (!faceapi) {
    faceapi = await import("@vladmandic/face-api");
  }
  return faceapi;
}

/** Load the 3 model networks once. Safe to call repeatedly. */
export async function loadModels(): Promise<void> {
  if (modelsPromise) return modelsPromise;
  modelsPromise = (async () => {
    const api = await getFaceApi();
    // The TensorFlow.js backend initialises itself on first inference.
    await Promise.all([
      api.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      api.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      api.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
  })();
  return modelsPromise;
}

/** Decode a File / blob URL into an <img> element. */
async function fileToImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

/** Load a remote image through our proxy so the canvas isn't CORS-tainted. */
async function urlToImage(url: string): Promise<HTMLImageElement> {
  const res = await fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error("image fetch failed");
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
  const api = await getFaceApi();
  const img = await fileToImage(file);
  try {
    const detection = await api
      .detectSingleFace(img, new api.SsdMobilenetv1Options({ minConfidence: 0.35 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    return detection ? detection.descriptor : null;
  } finally {
    if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
  }
}

/** Compute descriptors for every face found in a remote photo. */
export async function getPhotoDescriptors(url: string): Promise<Float32Array[]> {
  await loadModels();
  const api = await getFaceApi();
  const img = await urlToImage(url);
  try {
    const detections = await api
      .detectAllFaces(img, new api.SsdMobilenetv1Options({ minConfidence: 0.35 }))
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
 */
export async function matchSelfieToPhotos<T extends { cdnUrl: string }>(
  selfie: File,
  photos: T[],
  onProgress?: (done: number, total: number, matchesSoFar: number) => void
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
      if (best < MATCH_THRESHOLD) {
        // Map distance (0..threshold) → confidence (100..~50)
        const confidence = Math.round(Math.max(0, (1 - best)) * 100);
        matches.push({ photo, distance: best, confidence });
      }
    } catch {
      // a single photo failing to load shouldn't abort the whole scan
    }
    onProgress?.(i + 1, photos.length, matches.length);
  }

  matches.sort((a, b) => a.distance - b.distance);
  return matches;
}
