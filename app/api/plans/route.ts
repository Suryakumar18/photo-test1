/**
 * GET  /api/plans   — public, returns all active plans ordered by `order`
 * POST /api/plans   — superadmin only, create a plan
 */
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Plan } from "@/models/Plan";
import { requireSuperAdmin } from "@/lib/auth";

const DEFAULT_PLANS = [
  {
    name: "Starter", price: 999, period: "/month",
    description: "Perfect for freelance photographers",
    features: ["5 events per month", "500 photos per event", "5GB storage",
      "QR code generation", "Basic gallery", "Email support"],
    popular: false, cta: "Get Started", order: 0,
  },
  {
    name: "Professional", price: 2999, period: "/month",
    description: "For growing photography studios",
    features: ["Unlimited events", "Unlimited photos", "100GB storage",
      "AI face recognition", "Live uploads", "Custom branding",
      "Analytics dashboard", "Priority support"],
    popular: true, cta: "Start Free Trial", order: 1,
  },
  {
    name: "Enterprise", price: 7999, period: "/month",
    description: "For large studios & agencies",
    features: ["Everything in Pro", "1TB storage", "White-label platform",
      "Custom domain", "API access", "Dedicated CDN",
      "SLA guarantee", "24/7 phone support"],
    popular: false, cta: "Contact Sales", order: 2,
  },
];

export async function GET() {
  try {
    await connectDB();
    let plans = await Plan.find({ active: true }).sort({ order: 1 }).lean();
    // Seed default plans if none exist yet
    if (plans.length === 0) {
      await Plan.insertMany(DEFAULT_PLANS);
      plans = await Plan.find({ active: true }).sort({ order: 1 }).lean();
    }
    return NextResponse.json({ success: true, data: plans });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch plans" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }
  try {
    await connectDB();
    const body = await req.json();
    const plan = await Plan.create(body);
    return NextResponse.json({ success: true, data: plan });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to create plan" }, { status: 500 });
  }
}
