import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Event } from "@/models/Event";
import { requireAuth } from "@/lib/auth";
import { signCDNUrl } from "@/lib/bunny";
import mongoose from "mongoose";

type RouteContext = { params: Promise<{ slug: string }> };

/** GET /api/events/:idOrSlug — fetch one event */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = requireAuth(req, ["admin", "photographer"]);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { slug } = await params;

  try {
    await connectDB();

    // Accept both MongoDB ObjectId and human slug
    const query = mongoose.isValidObjectId(slug) ? { _id: slug } : { slug };
    const event = await Event.findOne(query).lean<import("@/models/Event").IEvent>();

    if (!event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    const data = {
      ...event,
      coverImageCDN: event.coverImageCDN ? signCDNUrl(event.coverImageCDN) : event.coverImageCDN,
    };
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Get event error:", msg);
    return NextResponse.json({ success: false, error: "Failed to fetch event" }, { status: 500 });
  }
}

/** PATCH /api/events/:idOrSlug — update event fields */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const auth = requireAuth(req, ["admin"]);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { slug } = await params;

  try {
    await connectDB();

    const body = await req.json();
    const allowed = ["status", "title", "location", "isPublic", "description", "tags"];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    const query = mongoose.isValidObjectId(slug) ? { _id: slug } : { slug };
    const event = await Event.findOneAndUpdate(query, { $set: updates }, { new: true }).lean();

    if (!event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: event, message: "Event updated" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Update event error:", msg);
    return NextResponse.json({ success: false, error: "Failed to update event" }, { status: 500 });
  }
}

/** DELETE /api/events/:idOrSlug — delete an event */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const auth = requireAuth(req, ["admin"]);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { slug } = await params;

  try {
    await connectDB();

    const query = mongoose.isValidObjectId(slug) ? { _id: slug } : { slug };
    const event = await Event.findOneAndDelete(query);

    if (!event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Event deleted successfully" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: "Failed to delete event" }, { status: 500 });
  }
}
