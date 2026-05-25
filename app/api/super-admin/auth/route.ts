import { NextRequest, NextResponse } from "next/server";
import { signSuperAdminToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const superEmail    = process.env.SUPER_ADMIN_EMAIL    || "superadmin@memorablepictures.com";
    const superPassword = process.env.SUPER_ADMIN_PASSWORD || "SuperAdmin@2024";

    const { email, password } = await req.json();

    if (email !== superEmail || password !== superPassword) {
      return NextResponse.json(
        { success: false, error: "Invalid super admin credentials" },
        { status: 401 }
      );
    }

    const token = signSuperAdminToken({
      role:  "super_admin",
      email: superEmail,
      name:  "Super Admin",
    });

    const response = NextResponse.json({
      success: true,
      data: { token, email: superEmail, name: "Super Admin" },
    });

    response.cookies.set("super-admin-token", token, {
      httpOnly: false,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge:   24 * 60 * 60,
      path:     "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: "Login failed" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("super-admin-token");
  return response;
}
