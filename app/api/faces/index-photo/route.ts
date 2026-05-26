/**
 * POST /api/faces/index-photo
 *
 * Server-side face indexing.
 * Currently returns 503 because @tensorflow/tfjs-node is not installed.
 * The admin panel falls back to browser-side face-api.js automatically.
 *
 * To enable: npm install @tensorflow/tfjs-node, then implement
 * extractDescriptors() in lib/face-recognition-server.ts.
 */

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { success: false, error: "Server-side face indexing not configured — use browser scan" },
    { status: 503 },
  );
}
