import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { User } from "@/models/User";
import { requireAuth } from "@/lib/auth";
import mongoose from "mongoose";

/** PATCH /api/team/[userId] — update photographer details or toggle active */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = requireAuth(req, ["admin"]);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { userId } = await params;
  const studioId = auth.user.studioId;

  await connectDB();

  let objectId: mongoose.Types.ObjectId;
  try {
    objectId = new mongoose.Types.ObjectId(userId);
  } catch {
    return NextResponse.json({ success: false, error: "Invalid user id" }, { status: 400 });
  }

  // Only allow editing photographers that belong to the same studio
  const user = await User.findOne({
    _id: objectId,
    studioId,
    role: "photographer",
  });

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Photographer not found in your studio" },
      { status: 404 }
    );
  }

  const body = await req.json();
  if (body.name !== undefined) user.name = body.name;
  if (body.phone !== undefined) user.phone = body.phone;
  if (body.isActive !== undefined) user.isActive = body.isActive;

  await user.save();

  return NextResponse.json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      studioId: user.studioId,
      isActive: user.isActive,
    },
  });
}

/** DELETE /api/team/[userId] — remove a photographer from the studio */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = requireAuth(req, ["admin"]);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { userId } = await params;
  const studioId = auth.user.studioId;

  await connectDB();

  let objectId: mongoose.Types.ObjectId;
  try {
    objectId = new mongoose.Types.ObjectId(userId);
  } catch {
    return NextResponse.json({ success: false, error: "Invalid user id" }, { status: 400 });
  }

  const deleted = await User.findOneAndDelete({
    _id: objectId,
    studioId,
    role: "photographer", // cannot delete admin accounts from here
  });

  if (!deleted) {
    return NextResponse.json(
      { success: false, error: "Photographer not found in your studio" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, message: "Photographer removed" });
}
