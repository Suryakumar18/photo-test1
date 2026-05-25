const mongoose = require("mongoose");
const MONGODB_URI = "mongodb+srv://photographyapp71_db_user:3XiEwvKYpePm8TY0@cluster0.objlne2.mongodb.net/?appName=Cluster0";

async function seed() {
  console.log("\n🌱  Memorable Pictures — Reset & Seed");
  console.log("=".repeat(50));

  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log("✅  Connected to MongoDB:", MONGODB_URI);

  const db = mongoose.connection.db;

  // Wipe every collection so the platform starts completely empty
  const collections = await db.listCollections().toArray();
  if (collections.length === 0) {
    console.log("ℹ️   Database already empty — nothing to wipe.");
  } else {
    for (const col of collections) {
      await db.collection(col.name).deleteMany({});
      console.log(`🗑️   Cleared: ${col.name}`);
    }
  }

  console.log("\n✅  All collections wiped — platform is now empty.");

  // ── Print super admin credentials ──────────────────────────────────────────
  console.log("\n" + "=".repeat(50));
  console.log("🛡️   SUPER ADMIN CREDENTIALS");
  console.log("=".repeat(50));
  console.log(`URL      : http://localhost:3000/super-admin/login`);
  console.log(`Email    : superadmin@memorablepictures.com`);
  console.log(`Password : SuperAdmin@2024`);
  console.log(`TTL      : 12 hours`);

  console.log("\n" + "=".repeat(50));
  console.log("🔗  QUICK LINKS");
  console.log("=".repeat(50));
  console.log("Super Admin  →  http://localhost:3000/super-admin/login");
  console.log("Studio Login →  http://localhost:3000/login");
  console.log("");
  console.log("💡  Log in as super admin, then create studios from the portal.");
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
