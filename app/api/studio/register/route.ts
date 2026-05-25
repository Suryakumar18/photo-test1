import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Studio } from "@/models/Studio";
import { User } from "@/models/User";
import { ActivityLog } from "@/models/ActivityLog";
import { signToken } from "@/lib/auth";

function generateStudioId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "STD-";
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { studioName, ownerName, email, password, phone, address } = await req.json();

    if (!studioName || !ownerName || !email || !password) {
      return NextResponse.json(
        { success: false, error: "studioName, ownerName, email, password are required" },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    let studioId = generateStudioId();
    let attempts = 0;
    while ((await Studio.findOne({ studioId })) && attempts < 10) {
      studioId = generateStudioId();
      attempts++;
    }

    const [studio, user] = await Promise.all([
      Studio.create({
        studioId,
        name: studioName,
        ownerName,
        ownerEmail: email.toLowerCase(),
        phone,
        address,
        plan: "trial",
        status: "trial",
        storageLimit: 5 * 1024 * 1024 * 1024,
      }),
      User.create({
        name: ownerName,
        email: email.toLowerCase(),
        password,
        role: "admin",
        studioId,
      }),
    ]);

    await ActivityLog.create({
      studioId,
      type: "studio_created",
      description: `Studio "${studioName}" registered`,
    });

    const token = signToken({
      userId: (user._id as { toString(): string }).toString(),
      email: user.email,
      role: "admin",
      name: user.name,
      studioId,
    });

    const response = NextResponse.json(
      {
        success: true,
        data: {
          studioId,
          studioName: studio.name,
          token,
          user: { _id: user._id, name: user.name, email: user.email, role: user.role, studioId },
        },
      },
      { status: 201 }
    );

    response.cookies.set("auth-token", token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Studio register error:", error);
    return NextResponse.json({ success: false, error: "Registration failed" }, { status: 500 });
  }
}
