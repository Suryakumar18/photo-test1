import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Studio } from "@/models/Studio";
import { Invoice } from "@/models/Invoice";
import { requireSuperAdmin } from "@/lib/auth";
import { getBillingStatus, daysUntilDue } from "@/lib/billing";

// ── GET /api/super-admin/billing ──────────────────────────────────────────
// Returns all studios enriched with computed billingStatus + latest invoice.
export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if ("error" in auth)
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const filter  = searchParams.get("filter") || "all"; // all|due_soon|overdue|suspended|active
  const search  = searchParams.get("search") || "";
  const page    = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit   = Math.min(50, parseInt(searchParams.get("limit") || "20"));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { studioId: { $regex: search, $options: "i" } },
      { ownerEmail: { $regex: search, $options: "i" } },
    ];
  }

  const studios = await Studio.find(query)
    .select("studioId name ownerName ownerEmail plan status billing createdAt")
    .sort({ "billing.nextDueDate": 1 })
    .lean();

  // Attach computed billing status
  const enriched = studios
    .map((s) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = (s as any).billing;
      // ← guarantee billing is always an object even for studios created
      //   before the billing feature was added
      const b = {
        planPrice:        raw?.planPrice        ?? 0,
        currency:         raw?.currency         ?? "INR",
        billingCycleDays: raw?.billingCycleDays ?? 28,
        nextDueDate:      raw?.nextDueDate      ?? new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
        lastPaidDate:     raw?.lastPaidDate,
      };
      const nextDue: Date = b.nextDueDate instanceof Date ? b.nextDueDate : new Date(b.nextDueDate);
      const status = getBillingStatus(nextDue);
      const days   = daysUntilDue(nextDue);
      return { ...s, billing: b, billingStatus: status, daysUntilDue: days };
    })
    .filter((s) => filter === "all" || s.billingStatus === filter);

  // Summary counts
  const allEnriched = studios.map((s) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b = (s as any).billing ?? {};
    return getBillingStatus(b.nextDueDate ?? new Date(0));
  });
  const summary = {
    total:     studios.length,
    active:    allEnriched.filter((x) => x === "active").length,
    due_soon:  allEnriched.filter((x) => x === "due_soon").length,
    overdue:   allEnriched.filter((x) => x === "overdue").length,
    suspended: allEnriched.filter((x) => x === "suspended").length,
  };

  // Paginate
  const total = enriched.length;
  const paged = enriched.slice((page - 1) * limit, page * limit);

  // Attach latest invoice to each studio
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const studioIds = paged.map((s) => (s as any).studioId as string);
  const latestInvoices = await Invoice.find({ studioId: { $in: studioIds } })
    .sort({ createdAt: -1 })
    .lean();

  const invoiceMap = new Map<string, typeof latestInvoices[0]>();
  for (const inv of latestInvoices) {
    if (!invoiceMap.has(inv.studioId)) invoiceMap.set(inv.studioId, inv);
  }

  const result = paged.map((s) => ({
    ...s,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    latestInvoice: invoiceMap.get((s as any).studioId as string) ?? null,
  }));

  return NextResponse.json({
    success: true,
    data: result,
    summary,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
