/**
 * PATCH  /api/plans/[id]  — superadmin, update plan
 * DELETE /api/plans/[id]  — superadmin, soft-delete (active=false)
 */
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Plan } from "@/models/Plan";
import { requireSuperAdmin } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireSuperAdmin(req);
  if ("error" in auth)
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const { id } = await params;
  try {
    await connectDB();
    const body = await req.json();
    const plan = await Plan.findByIdAndUpdate(id, body, { new: true });
    if (!plan) return NextResponse.json({ success: false, error: "Plan not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: plan });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update plan" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireSuperAdmin(req);
  if ("error" in auth)
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const { id } = await params;
  try {
    await connectDB();
    await Plan.findByIdAndUpdate(id, { active: false });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete plan" }, { status: 500 });
  }
}
