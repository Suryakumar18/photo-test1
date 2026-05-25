import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Studio } from "@/models/Studio";
import { Invoice } from "@/models/Invoice";
import { requireSuperAdmin } from "@/lib/auth";
import { buildInvoiceNumber, getBillingStatus, daysUntilDue } from "@/lib/billing";

type Ctx = { params: Promise<{ studioId: string }> };

// ── GET /api/super-admin/billing/[studioId] ───────────────────────────────
// Returns studio billing info + full invoice history.
export async function GET(req: NextRequest, { params }: Ctx) {
  const auth = requireSuperAdmin(req);
  if ("error" in auth)
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const { studioId } = await params;
  await connectDB();

  const studio = await Studio.findOne({ studioId })
    .select("studioId name ownerName ownerEmail plan status billing")
    .lean();

  if (!studio)
    return NextResponse.json({ success: false, error: "Studio not found" }, { status: 404 });

  const invoices = await Invoice.find({ studioId }).sort({ createdAt: -1 }).lean();

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
      studio: { ...studio, billing: b },
      billingStatus: getBillingStatus(nextDue),
      daysUntilDue: daysUntilDue(nextDue),
      invoices,
    },
  });
}

// ── POST /api/super-admin/billing/[studioId] ──────────────────────────────
// Actions: "mark_paid" | "update_price" | "extend_due"
export async function POST(req: NextRequest, { params }: Ctx) {
  const auth = requireSuperAdmin(req);
  if ("error" in auth)
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const { studioId } = await params;
  await connectDB();

  const studio = await Studio.findOne({ studioId });
  if (!studio)
    return NextResponse.json({ success: false, error: "Studio not found" }, { status: 404 });

  const body = await req.json();
  const { action } = body;

  // ── mark_paid ────────────────────────────────────────────────────────────
  if (action === "mark_paid") {
    const { transactionId, paidAmount, invoiceId, notes } = body;

    if (!transactionId || !paidAmount) {
      return NextResponse.json(
        { success: false, error: "transactionId and paidAmount are required" },
        { status: 400 }
      );
    }

    const now = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b = (studio as any).billing ?? {};
    const cycleDays: number = b.billingCycleDays ?? 28;
    const nextDueDate = new Date(now.getTime() + cycleDays * 24 * 60 * 60 * 1000);

    // Mark the specific invoice as paid (or the latest pending one)
    const invoiceFilter = invoiceId
      ? { _id: invoiceId, studioId }
      : { studioId, status: { $in: ["pending", "overdue"] } };

    const inv = await Invoice.findOneAndUpdate(
      invoiceFilter,
      {
        $set: {
          status: "paid",
          paidAt: now,
          transactionId,
          paidAmount: Number(paidAmount),
          markedPaidBy: auth.admin.email,
          notes: notes || "",
        },
      },
      { new: true, sort: { createdAt: -1 } }
    );

    if (!inv) {
      return NextResponse.json({ success: false, error: "No pending invoice found" }, { status: 404 });
    }

    // Advance the billing cycle
    studio.set("billing.lastPaidDate", now);
    studio.set("billing.nextDueDate", nextDueDate);
    studio.set("status", "active");
    await studio.save();

    // Generate the next invoice automatically
    const invoiceCount = await Invoice.countDocuments({ studioId });
    const newInvoice = await Invoice.create({
      invoiceNumber: buildInvoiceNumber(studioId, invoiceCount + 1),
      studioId,
      studioName: studio.name,
      ownerEmail: studio.ownerEmail,
      periodStart: now,
      periodEnd: nextDueDate,
      dueDate: nextDueDate,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      amount: (studio as any).billing?.planPrice ?? 0,
      currency: "INR",
      status: "pending",
    });

    return NextResponse.json({
      success: true,
      message: "Payment recorded, next invoice generated",
      data: { paidInvoice: inv, nextInvoice: newInvoice, nextDueDate },
    });
  }

  // ── update_price ─────────────────────────────────────────────────────────
  if (action === "update_price") {
    const { planPrice } = body;
    if (typeof planPrice !== "number" || planPrice < 0)
      return NextResponse.json({ success: false, error: "Invalid planPrice" }, { status: 400 });

    studio.set("billing.planPrice", planPrice);
    await studio.save();
    return NextResponse.json({ success: true, message: "Plan price updated" });
  }

  // ── extend_due ───────────────────────────────────────────────────────────
  if (action === "extend_due") {
    const { days } = body;
    if (!days || days < 1)
      return NextResponse.json({ success: false, error: "days must be >= 1" }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const current = (studio as any).billing?.nextDueDate ?? new Date();
    const extended = new Date(current.getTime() + days * 24 * 60 * 60 * 1000);
    studio.set("billing.nextDueDate", extended);
    studio.set("status", "active");
    await studio.save();

    return NextResponse.json({
      success: true,
      message: `Due date extended by ${days} days`,
      data: { nextDueDate: extended },
    });
  }

  return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
}
