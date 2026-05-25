import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { User } from "@/models/User";
import { requireAuth } from "@/lib/auth";

function generatePassword(): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "@#$!";
  const all = upper + lower + digits + special;
  let pass =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    digits[Math.floor(Math.random() * digits.length)] +
    special[Math.floor(Math.random() * special.length)];
  for (let i = 0; i < 6; i++) pass += all[Math.floor(Math.random() * all.length)];
  return pass
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

/** GET /api/team — list all admins + photographers in current studio */
export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ["admin"]);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const studioId = auth.user.studioId;
  if (!studioId) {
    return NextResponse.json({ success: false, error: "No studio associated" }, { status: 400 });
  }

  await connectDB();

  const team = await User.find({ studioId, role: { $in: ["admin", "photographer"] } })
    .select("-password")
    .sort({ role: 1, createdAt: 1 })
    .lean();

  return NextResponse.json({ success: true, data: team });
}

/** POST /api/team — create a new photographer under current studio */
export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ["admin"]);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const studioId = auth.user.studioId;
  if (!studioId) {
    return NextResponse.json({ success: false, error: "No studio associated" }, { status: 400 });
  }

  await connectDB();

  const body = await req.json();
  const { name, email, phone, password: rawPassword } = body;

  if (!name || !email) {
    return NextResponse.json(
      { success: false, error: "name and email are required" },
      { status: 400 }
    );
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return NextResponse.json(
      { success: false, error: "Email already registered" },
      { status: 409 }
    );
  }

  const plainPassword = rawPassword?.trim() || generatePassword();

  const photographer = new User({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: plainPassword, // hashed by pre-save hook
    role: "photographer",
    studioId,
    phone: phone?.trim(),
    isActive: true,
  });
  await photographer.save();

  return NextResponse.json(
    {
      success: true,
      data: {
        user: {
          _id: photographer._id,
          name: photographer.name,
          email: photographer.email,
          role: photographer.role,
          phone: photographer.phone,
          studioId: photographer.studioId,
          isActive: photographer.isActive,
          createdAt: photographer.createdAt,
        },
        // Password shown ONCE
        password: plainPassword,
      },
    },
    { status: 201 }
  );
}
