import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/auth";
import bcrypt from "bcryptjs";

// ── POST /api/auth/change-password ────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ["admin", "photographer"]);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Current and new passwords are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }

    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not connected" }, { status: 500 });
    }

    const userDoc = await db
      .collection("users")
      .findOne({ email: auth.user.email });

    if (!userDoc || !userDoc.password) {
      return NextResponse.json(
        { success: false, error: "User not found or no password set" },
        { status: 404 }
      );
    }

    const isMatch = await bcrypt.compare(currentPassword, userDoc.password as string);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await db
      .collection("users")
      .updateOne({ _id: userDoc._id }, { $set: { password: hashed } });

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ success: false, error: "Failed to update password" }, { status: 500 });
  }
}
