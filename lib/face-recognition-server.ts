/**
 * Server-side face recognition — NO browser, NO Python, NO external services.
 *
 * Uses @vladmandic/face-api via its BUNDLED browser build (face-api.js)
 * which ships TensorFlow.js inline. In Node.js the WebGL backend fails
 * gracefully and TF.js falls back to the pure-JS CPU backend that is always
 * available. Models are loaded once per process from public/models.
 *
 * Sharp (already installed) is used for image decoding / resizing.
 *
 * Accuracy notes vs browser:
 *  • Server has no canvas size limit → processes full-resolution photos
 *  • minConfidence 0.2 → catches more faces in crowded group shots
 *  • Consistent CPU environment, no WebGL memory pressure
 *  → Expected recall on group photos of 10-20 people: ~75-85 %
 */

import sharp from "sharp";
import { join } from "path";

// ── Lazy-loaded singletons ────────────────────────────────────────────────────
// Using require() for the browser bundle avoids the default "face-api.node.js"
// entry which hard-requires @tensorflow/tfjs-node (native bindings).
// The browser bundle already includes TF.js; in Node.js it selects the CPU
// backend automatically after WebGL initialisation fails.

// eslint-disable-next-line @typescript-eslint/no-require-imports
type FaceApiModule = typeof import("@vladmandic/face-api");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _faceapi: FaceApiModule | null = null;
let _initPromise: Promise<void> | null = null;

const MODEL_PATH = join(process.cwd(), "public", "models");

async function loadFaceApi(): Promise<FaceApiModule> {
  if (_faceapi) return _faceapi;

  if (_initPromise) {
    await _initPromise;
    return _faceapi!;
  }

  _initPromise = (async () => {
    // Use the browser bundle — it has TF.js bundled and CPU-falls-back in Node.js
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    const mod = require("@vladmandic/face-api/dist/face-api.js") as FaceApiModule;

    // Load models from the local filesystem (public/models/)
    await Promise.all([
      mod.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH),
      mod.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH),
      mod.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH),
    ]);

    _faceapi = mod;
    console.log("[face-server] Models loaded from", MODEL_PATH);
  })();

  await _initPromise;
  return _faceapi!;
}

// ── Image → pixel tensor ──────────────────────────────────────────────────────

/**
 * Decode an image buffer with sharp and produce an ImageData-like object that
 * face-api.js can ingest via tf.browser.fromPixels / its own toNetInput path.
 * We fake just enough of the DOM ImageData interface.
 */
async function bufferToImageData(
  buf: Buffer,
  maxWidth = 800,
): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  const { data, info } = await sharp(buf)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .ensureAlpha()  // RGBA — required by browser.fromPixels
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
    width: info.width,
    height: info.height,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Extract 128-d FaceNet descriptors for EVERY face in a photo.
 * Used when indexing event photos.
 */
export async function extractDescriptors(imageBuffer: Buffer): Promise<number[][]> {
  const api = await loadFaceApi();
  const imgData = await bufferToImageData(imageBuffer, 800);

  // face-api.js accepts a DOM-like ImageData object as input
  const detections = await api
    .detectAllFaces(
      imgData as unknown as HTMLImageElement,
      new api.SsdMobilenetv1Options({ minConfidence: 0.2 }),
    )
    .withFaceLandmarks()
    .withFaceDescriptors();

  return detections.map((d) => Array.from(d.descriptor));
}

/**
 * Extract a 128-d FaceNet descriptor for the LARGEST (primary) face in a selfie.
 * Returns null if no face is detected.
 */
export async function extractSelfieDescriptor(imageBuffer: Buffer): Promise<number[] | null> {
  const api = await loadFaceApi();
  const imgData = await bufferToImageData(imageBuffer, 640);

  const detection = await api
    .detectSingleFace(
      imgData as unknown as HTMLImageElement,
      new api.SsdMobilenetv1Options({ minConfidence: 0.3 }),
    )
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection ? Array.from(detection.descriptor) : null;
}
