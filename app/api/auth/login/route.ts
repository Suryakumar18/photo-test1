import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";
import { signToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, password, role } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    await connectDB();

    // Fetch the raw user document with password via the native driver (bypasses Mongoose model caching issues)
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database not connected" },
        { status: 500 }
      );
    }

    const userDoc = await db.collection("users").findOne({ email: normalizedEmail });

    if (!userDoc) {
      // Fallback: check env admin credentials
      if (
        normalizedEmail === process.env.ADMIN_EMAIL?.toLowerCase().trim() &&
        password === process.env.ADMIN_PASSWORD
      ) {
        return buildAdminResponse(normalizedEmail);
      }
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!userDoc.isActive) {
      return NextResponse.json(
        { success: false, error: "Account is deactivated" },
        { status: 403 }
      );
    }

    // Use bcrypt.compare directly on the raw password hash — avoids Mongoose instance method issues
    const isMatch = await bcrypt.compare(password, userDoc.password as string);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Role check — allow admin to log in from either tab
    const userRole = userDoc.role as string;
    if (role && userRole !== role && !(userRole === "admin" && role === "admin")) {
      return NextResponse.json(
        { success: false, error: "Invalid role for this account" },
        { status: 403 }
      );
    }

    // Update lastLogin without triggering pre-save hook re-hash
    await db.collection("users").updateOne(
      { _id: userDoc._id },
      { $set: { lastLogin: new Date() } }
    );

    const token = signToken({
      userId: userDoc._id.toString(),
      email: userDoc.email as string,
      role: userRole as "admin" | "photographer" | "client",
      name: userDoc.name as string,
      studioId: (userDoc.studioId as string) || undefined,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          _id: userDoc._id.toString(),
          name: userDoc.name,
          email: userDoc.email,
          role: userRole,
          avatar: userDoc.avatar ?? null,
          studioId: (userDoc.studioId as string) || null,
        },
        token,
      },
    });

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === "development"
            ? `Login error: ${msg}`
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}

function buildAdminResponse(email: string) {
  const token = signToken({
    userId: "admin-000",
    email,
    role: "admin",
    name: "Admin",
  });

  const response = NextResponse.json({
    success: true,
    data: {
      user: {
        _id: "admin-000",
        name: "Admin",
        email,
        role: "admin",
        avatar: null,
      },
      token,
    },
  });

  response.cookies.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60, // 24 hours
    path: "/",
  });

  return response;
}
