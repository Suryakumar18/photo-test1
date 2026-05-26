/**
 * Server-side face recognition placeholder.
 *
 * @vladmandic/face-api's browser bundle does not expose loadFromDisk()
 * and the node bundle requires @tensorflow/tfjs-node (native bindings).
 * Neither is available in this deployment without extra setup.
 *
 * Both functions return empty arrays / null — the callers fall back to
 * browser-side face-api.js which runs reliably in the admin panel.
 *
 * To enable true server-side detection in the future:
 *   npm install @tensorflow/tfjs-node   (native, fastest)
 * or
 *   npm install @tensorflow/tfjs @tensorflow/tfjs-backend-wasm  (pure JS)
 * then update extractDescriptors() / extractSelfieDescriptor() below.
 */

/** Returns empty array — callers fall back to browser-side indexing. */
export async function extractDescriptors(_imageBuffer: Buffer): Promise<number[][]> {
  return [];
}

/** Returns null — callers fall back to browser-side selfie detection. */
export async function extractSelfieDescriptor(_imageBuffer: Buffer): Promise<number[] | null> {
  return null;
}
