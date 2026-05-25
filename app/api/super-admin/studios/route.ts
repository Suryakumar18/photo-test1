import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Studio } from "@/models/Studio";
import { User } from "@/models/User";
import { ActivityLog } from "@/models/ActivityLog";
import { Invoice } from "@/models/Invoice";
import { requireSuperAdmin } from "@/lib/auth";
import { buildInvoiceNumber } from "@/lib/billing";

function generateStudioId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "STD-";
  for (let i = 0; i < 6; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  return id;
}

/** Generate a password with at least 1 upper, 1 lower, 1 digit, 1 special */
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

export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if ("error" in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const plan = searchParams.get("plan") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const query: Record<string, unknown> = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { studioId: { $regex: search, $options: "i" } },
        { ownerEmail: { $regex: search, $options: "i" } },
        { ownerName: { $regex: search, $options: "i" } },
      ];
    }
    if (status) query.status = status;
    if (plan) query.plan = plan;

    const [studios, total] = await Promise.all([
      Studio.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Studio.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: studios,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("List studios error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch studios" }, { status: 500 });
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
    const {
      name,
      ownerName,
      ownerEmail,
      phone,
      address,
      plan,
      storageLimit,
      notes,
      adminPassword,
      allowFaceMatch = true,
      allowPublicGallery = true,
      planPrice = 0,        // ₹ per 28-day cycle (set by super admin)
    } = body;

    if (!name || !ownerName || !ownerEmail) {
      return NextResponse.json(
        { success: false, error: "name, ownerName, ownerEmail are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = ownerEmail.toLowerCase().trim();

    // Reject if email already has an account
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Generate unique studioId
    let studioId = generateStudioId();
    let attempts = 0;
    while ((await Studio.findOne({ studioId })) && attempts < 10) {
      studioId = generateStudioId();
      attempts++;
    }

    // Use provided password or auto-generate
    const plainPassword = adminPassword?.trim() || generatePassword();

    const now = new Date();
    const nextDueDate = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);

    // Create studio
    const studio = await Studio.create({
      studioId,
      name,
      ownerName,
      ownerEmail: normalizedEmail,
      phone,
      address,
      plan: plan || "trial",
      status: plan && plan !== "trial" ? "active" : "trial",
      storageLimit: storageLimit || 5 * 1024 * 1024 * 1024,
      notes,
      settings: { allowFaceMatch, allowPublicGallery },
      billing: {
        planPrice: Number(planPrice) || 0,
        currency: "INR",
        billingCycleDays: 28,
        nextDueDate,
      },
    });

    // Create the first invoice for this studio
    const invoiceCount = await Invoice.countDocuments({ studioId });
    await Invoice.create({
      invoiceNumber: buildInvoiceNumber(studioId, invoiceCount + 1),
      studioId,
      studioName: name,
      ownerEmail: normalizedEmail,
      periodStart: now,
      periodEnd: nextDueDate,
      dueDate: nextDueDate,
      amount: Number(planPrice) || 0,
      currency: "INR",
      status: "pending",
    });

    // Create the studio admin user (password is hashed by pre-save hook)
    const adminUser = new User({
      name: ownerName,
      email: normalizedEmail,
      password: plainPassword,
      role: "admin",
      studioId,
      isActive: true,
    });
    await adminUser.save();

    await ActivityLog.create({
      studioId,
      type: "studio_created",
      description: `Studio "${name}" created by super admin`,
      metadata: { createdBy: auth.admin.email, adminEmail: normalizedEmail },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          studio,
          // Credentials shown ONCE — never stored in plain text after this response
          adminCredentials: {
            email: normalizedEmail,
            password: plainPassword,
            studioId,
            loginUrl: "/login",
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create studio error:", error);
    return NextResponse.json({ success: false, error: "Failed to create studio" }, { status: 500 });
  }
}
