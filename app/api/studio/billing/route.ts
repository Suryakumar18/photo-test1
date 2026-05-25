import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Studio } from "@/models/Studio";
import { Invoice } from "@/models/Invoice";
import { requireAuth } from "@/lib/auth";
import { getBillingStatus, daysUntilDue } from "@/lib/billing";

// ── GET /api/studio/billing ───────────────────────────────────────────────
// Returns the calling studio's billing status + invoice history.
export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ["admin", "photographer"]);
  if ("error" in auth)
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  if (!auth.user.studioId)
    return NextResponse.json(
      { success: false, error: "No studio linked to this account" },
      { status: 400 }
    );

  await connectDB();

  const studio = await Studio.findOne({ studioId: auth.user.studioId })
    .select("studioId name ownerEmail plan billing status")
    .lean();

  if (!studio)
    return NextResponse.json({ success: false, error: "Studio not found" }, { status: 404 });

  const invoices = await Invoice.find({ studioId: auth.user.studioId })
    .sort({ createdAt: -1 })
    .lean();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = (studio as any).billing;
  const b = {
    planPrice:        raw?.planPrice        ?? 0,
    currency:         raw?.currency         ?? "INR",
    billingCycleDays: raw?.billingCycleDays ?? 28,
    nextDueDate:      raw?.nextDueDate      ?? new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
    lastPaidDate:     raw?.lastPaidDate,
  };
  const nextDue: Date = b.nextDueDate instanceof Date ? b.nextDueDate : new Date(b.nextDueDate);

  return NextResponse.json({
    success: true,
    data: {
      studio,
      billing: b,
      billingStatus: getBillingStatus(nextDue),
      daysUntilDue: daysUntilDue(nextDue),
      invoices,
    },
  });
}
