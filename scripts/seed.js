/**
 * Memorable Pictures — SaaS Seed Script
 * ─────────────────────────────────────
 * Wipes ALL collections and inserts only the Super Admin account.
 * Studios are created by the super admin through the portal.
 *
 * Run locally : node scripts/seed.js
 * npm script  : npm run seed
 */

const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

// ─── Connection ───────────────────────────────────────────────────────────────
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://photographyapp71_db_user:3XiEwvKYpePm8TY0@cluster0.objlne2.mongodb.net/photographyevents?retryWrites=true&w=majority&appName=Cluster0";

// ─── Super Admin credentials ──────────────────────────────────────────────────
const SA_EMAIL    = process.env.SUPER_ADMIN_EMAIL    || "superadmin@memorablepictures.com";
const SA_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || "SuperAdmin@2024";

// ─── Inline Schemas ───────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema(
  {
    name:      { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:  { type: String, required: true },
    role:      { type: String, enum: ["admin", "photographer", "client", "super_admin"], default: "client" },
    studioId:  { type: String, default: null },
    isActive:  { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

const StudioSchema = new mongoose.Schema(
  {
    studioId:     { type: String, required: true, unique: true },
    name:         { type: String, required: true },
    ownerName:    String,
    ownerEmail:   String,
    phone:        String,
    address:      String,
    plan:         { type: String, enum: ["trial", "starter", "professional", "enterprise"], default: "trial" },
    status:       { type: String, enum: ["active", "trial", "suspended", "inactive"], default: "trial" },
    storageLimit: { type: Number, default: 5 * 1024 * 1024 * 1024 },
    storageUsed:  { type: Number, default: 0 },
    logo:         String,
    notes:        String,
    billing: {
      planPrice:        { type: Number, default: 0 },
      currency:         { type: String, default: "INR" },
      billingCycleDays: { type: Number, default: 28 },
      nextDueDate:      Date,
      lastPaidDate:     Date,
    },
    settings: {
      watermarkEnabled:   { type: Boolean, default: false },
      watermark:          String,
      allowFaceMatch:     { type: Boolean, default: true },
      allowPublicGallery: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: String,
    studioId:      String,
    studioName:    String,
    ownerEmail:    String,
    periodStart:   Date,
    periodEnd:     Date,
    dueDate:       Date,
    amount:        { type: Number, default: 0 },
    currency:      { type: String, default: "INR" },
    status:        { type: String, enum: ["pending", "paid", "overdue"], default: "pending" },
    paidAt:        Date,
    transactionId: String,
    paidAmount:    Number,
    markedPaidBy:  String,
    notes:         String,
  },
  { timestamps: true }
);

const EventSchema = new mongoose.Schema(
  {
    title:         String,
    slug:          { type: String, unique: true, sparse: true },
    studioId:      String,
    brideName:     String,
    groomName:     String,
    eventDate:     Date,
    location:      String,
    coverImage:    String,
    description:   String,
    photographers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    status:        { type: String, enum: ["upcoming", "live", "completed", "archived"], default: "upcoming" },
    photosCount:   { type: Number, default: 0 },
    storageUsed:   { type: Number, default: 0 },
    isPublic:      { type: Boolean, default: true },
    tags:          [String],
    qrCode:        String,
    shareUrl:      String,
    createdBy:     mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true }
);

const PhotoSchema = new mongoose.Schema(
  {
    eventId:      { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    studioId:     String,
    filename:     String,
    originalName: String,
    storagePath:  String,
    cdnUrl:       String,
    thumbnailUrl: String,
    width:        Number,
    height:       Number,
    size:         { type: Number, default: 0 },
    mimeType:     { type: String, default: "image/jpeg" },
    uploadedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    tags:         [String],
    favorites:    { type: Number, default: 0 },
    downloads:    { type: Number, default: 0 },
    isProcessed:  { type: Boolean, default: false },
    hasFaces:     { type: Boolean, default: false },
    faceCount:    { type: Number, default: 0 },
  },
  { timestamps: true }
);

const ActivityLogSchema = new mongoose.Schema(
  {
    studioId:    String,
    type:        String,
    description: String,
    metadata:    mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

// ─── Register models ──────────────────────────────────────────────────────────
const User        = mongoose.model("User",        UserSchema);
const Studio      = mongoose.model("Studio",      StudioSchema);
const Invoice     = mongoose.model("Invoice",     InvoiceSchema);
const Event       = mongoose.model("Event",       EventSchema);
const Photo       = mongoose.model("Photo",       PhotoSchema);
const ActivityLog = mongoose.model("ActivityLog", ActivityLogSchema);

// ─── Seed ─────────────────────────────────────────────────────────────────────
async function seed() {
  console.log("\n🌱  Memorable Pictures — Seed Script");
  console.log("=".repeat(50));

  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log("✅  Connected to MongoDB");

  // ── 1. Wipe all collections ─────────────────────────────────────────────────
  console.log("\n🗑️  Clearing all collections...");
  const db          = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  if (collections.length === 0) {
    console.log("    Database already empty.");
  } else {
    for (const col of collections) {
      await db.collection(col.name).deleteMany({});
      console.log(`    Cleared → ${col.name}`);
    }
  }

  // ── 2. Hash & verify super admin password ───────────────────────────────────
  console.log("\n🔐  Hashing super admin password...");
  const hashedPassword = await bcrypt.hash(SA_PASSWORD, 12);
  const verified       = await bcrypt.compare(SA_PASSWORD, hashedPassword);
  if (!verified) throw new Error("bcrypt hash verification failed!");
  console.log("    ✅  Password hashed successfully.");

  // ── 3. Insert super admin into users collection ─────────────────────────────
  await User.create({
    name:     "Super Admin",
    email:    SA_EMAIL,
    password: hashedPassword,
    role:     "super_admin",
    studioId: null,
    isActive: true,
  });
  console.log("    ✅  Super admin inserted into users collection.");

  // ── 4. Print credentials ────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(50));
  console.log("🛡️   SUPER ADMIN CREDENTIALS");
  console.log("=".repeat(50));
  console.log(`Email    : ${SA_EMAIL}`);
  console.log(`Password : ${SA_PASSWORD}`);
  console.log(`Login    : /super-admin/login`);
  console.log(`TTL      : 24 hours`);
  console.log("=".repeat(50));
  console.log("");
  console.log("💡  Log in as super admin → create studios from the portal.");
  console.log("    Each studio gets its own admin email + password on creation.");
  console.log("");

  await mongoose.disconnect();
  console.log("✅  Done.\n");
}

seed().catch((err) => {
  console.error("\n❌  Seed failed:", err.message);
  mongoose.disconnect();
  process.exit(1);
});
