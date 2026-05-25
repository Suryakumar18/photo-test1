/**
 * Memorable Pictures — Database Seeder
 * Run: node seed.js
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MONGODB_URI = "mongodb://localhost:27017/photographyevents";

// ─── Schemas ────────────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: String,
  role: { type: String, enum: ["admin", "photographer", "client"], default: "client" },
  avatar: String,
  phone: String,
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
}, { timestamps: true });

const EventSchema = new mongoose.Schema({
  title: String,
  slug: { type: String, unique: true },
  brideName: String,
  groomName: String,
  eventDate: Date,
  location: String,
  coverImage: String,
  coverImageCDN: String,
  description: String,
  photographers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  qrCode: String,
  shareUrl: String,
  status: { type: String, enum: ["upcoming", "live", "completed", "archived"], default: "upcoming" },
  photosCount: { type: Number, default: 0 },
  videosCount: { type: Number, default: 0 },
  viewsCount: { type: Number, default: 0 },
  faceMatchCount: { type: Number, default: 0 },
  storageUsed: { type: Number, default: 0 },
  isPublic: { type: Boolean, default: true },
  tags: [String],
  createdBy: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

const PhotoSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
  filename: String,
  originalName: String,
  storagePath: String,
  cdnUrl: String,
  thumbnailUrl: String,
  width: Number,
  height: Number,
  size: Number,
  mimeType: { type: String, default: "image/jpeg" },
  uploadedBy: mongoose.Schema.Types.Mixed,
  tags: [String],
  favorites: { type: Number, default: 0 },
  downloads: { type: Number, default: 0 },
  isProcessed: { type: Boolean, default: true },
  hasFaces: { type: Boolean, default: false },
  faceCount: { type: Number, default: 0 },
}, { timestamps: true });

// ─── Models ──────────────────────────────────────────────────────────────────

const User  = mongoose.model("User",  UserSchema);
const Event = mongoose.model("Event", EventSchema);
const Photo = mongoose.model("Photo", PhotoSchema);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slug(bride, groom, year, suffix) {
  const clean = (s) => s.toLowerCase().replace(/\s+/g, "-");
  return `${clean(bride)}-and-${clean(groom)}-${year}-${suffix}`;
}

const CDN = "https://wowlifestyle.b-cdn.net";
const APP = "http://localhost:3000";

const unsplashCovers = [
  "1519741497674-611481863552",
  "1583939003579-730e3918a45a",
  "1606216794074-735e91aa2c92",
  "1511285560929-80b456fea0bc",
  "1591604021695-0c69b7c05981",
  "1465495976277-4387d4b0b4c6",
  "1563729784474-d77dbb933a9e",
  "1595408076683-5d0c009e71e4",
];

const unsplashPhotos = [
  "1519741497674-611481863552",
  "1583939003579-730e3918a45a",
  "1606216794074-735e91aa2c92",
  "1511285560929-80b456fea0bc",
  "1591604021695-0c69b7c05981",
  "1465495976277-4387d4b0b4c6",
  "1563729784474-d77dbb933a9e",
  "1595408076683-5d0c009e71e4",
  "1519225421430-7523cd27f0b7",
  "1537633552985-df8429e8048b",
  "1529636798458-0bbbf68d2ef8",
  "1469371983542-2e1fdf1ba71b",
  "1522673607200-470f9e38d7d2",
  "1530103862676-de8c9debad1d",
  "1502635385003-d1c9b8c09da2",
  "1519225421430-7523cd27f0b7",
];

function randomPhoto() {
  const id = unsplashPhotos[Math.floor(Math.random() * unsplashPhotos.length)];
  return `https://images.unsplash.com/photo-${id}?w=800&q=80`;
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱  Memorable Pictures — Database Seeder");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  await mongoose.connect(MONGODB_URI);
  console.log("✅  Connected to MongoDB →", MONGODB_URI);

  // ── Wipe existing data ──────────────────────────────────────────────────
  await Promise.all([
    User.deleteMany({}),
    Event.deleteMany({}),
    Photo.deleteMany({}),
  ]);
  console.log("🗑️   Cleared existing collections");

  // ── 1. Users ─────────────────────────────────────────────────────────────
  // Hash and verify each password to ensure correctness
  const hashPwd = async (p) => {
    const h = await bcrypt.hash(p, 12);
    const ok = await bcrypt.compare(p, h);
    if (!ok) throw new Error(`Hash verification FAILED for password: ${p}`);
    return h;
  };

  const usersRaw = [
    // Admin
    {
      name: "Admin User",
      email: "admin@memorablepictures.com",
      password: await hashPwd("Admin@2024"),
      role: "admin",
      phone: "+91 98765 00001",
    },
    // Photographers
    {
      name: "Rahul Mehta",
      email: "rahul@memorablepictures.com",
      password: await hashPwd("Rahul@2024"),
      role: "photographer",
      phone: "+91 98765 43210",
    },
    {
      name: "Sunita Kapoor",
      email: "sunita@memorablepictures.com",
      password: await hashPwd("Sunita@2024"),
      role: "photographer",
      phone: "+91 87654 32109",
    },
    {
      name: "Amit Sharma",
      email: "amit@memorablepictures.com",
      password: await hashPwd("Amit@2024"),
      role: "photographer",
      phone: "+91 76543 21098",
    },
    {
      name: "Priya Nair",
      email: "priya.nair@memorablepictures.com",
      password: await hashPwd("Priya@2024"),
      role: "photographer",
      phone: "+91 65432 10987",
    },
    {
      name: "Deepak Studio",
      email: "deepak@memorablepictures.com",
      password: await hashPwd("Deepak@2024"),
      role: "photographer",
      phone: "+91 55432 10876",
    },
  ];

  const users = await User.insertMany(usersRaw);
  const [admin, rahul, sunita, amit, priyaNair, deepak] = users;
  console.log(`👤  Seeded ${users.length} users`);

  // ── 2. Events ─────────────────────────────────────────────────────────────
  const eventsData = [
    {
      title: "Priya & Arjun Wedding",
      brideName: "Priya",
      groomName: "Arjun",
      eventDate: new Date("2024-11-15"),
      location: "Taj Palace, New Delhi",
      coverImageCDN: `https://images.unsplash.com/photo-${unsplashCovers[0]}?w=1200&q=85`,
      photographers: [rahul._id, sunita._id],
      status: "completed",
      photosCount: 847,
      videosCount: 12,
      viewsCount: 423,
      faceMatchCount: 89,
      storageUsed: 4_250_000_000,
      description: "A grand celebration at the iconic Taj Palace with 500+ guests.",
      tags: ["grand", "north-indian", "delhi"],
      createdBy: admin._id,
    },
    {
      title: "Kavitha & Suresh Reception",
      brideName: "Kavitha",
      groomName: "Suresh",
      eventDate: new Date("2024-12-08"),
      location: "Grand Hyatt, Mumbai",
      coverImageCDN: `https://images.unsplash.com/photo-${unsplashCovers[1]}?w=1200&q=85`,
      photographers: [amit._id],
      status: "upcoming",
      photosCount: 0,
      videosCount: 0,
      viewsCount: 34,
      faceMatchCount: 0,
      storageUsed: 0,
      description: "Beachside reception at the Grand Hyatt with 300 guests.",
      tags: ["beachside", "mumbai", "reception"],
      createdBy: admin._id,
    },
    {
      title: "Meera & Rohan Wedding",
      brideName: "Meera",
      groomName: "Rohan",
      eventDate: new Date("2024-11-30"),
      location: "ITC Gardenia, Bangalore",
      coverImageCDN: `https://images.unsplash.com/photo-${unsplashCovers[2]}?w=1200&q=85`,
      photographers: [rahul._id, deepak._id],
      status: "live",
      photosCount: 234,
      videosCount: 5,
      viewsCount: 112,
      faceMatchCount: 28,
      storageUsed: 1_120_000_000,
      description: "A traditional South Indian ceremony with fusion elements.",
      tags: ["south-indian", "bangalore", "traditional"],
      createdBy: admin._id,
    },
    {
      title: "Nisha & Raj Engagement",
      brideName: "Nisha",
      groomName: "Raj",
      eventDate: new Date("2024-10-20"),
      location: "Leela Palace, Chennai",
      coverImageCDN: `https://images.unsplash.com/photo-${unsplashCovers[3]}?w=1200&q=85`,
      photographers: [sunita._id],
      status: "completed",
      photosCount: 389,
      videosCount: 4,
      viewsCount: 198,
      faceMatchCount: 42,
      storageUsed: 1_890_000_000,
      description: "Intimate engagement ceremony at the iconic Leela Palace.",
      tags: ["engagement", "chennai", "leela"],
      createdBy: admin._id,
    },
    {
      title: "Divya & Kiran Wedding",
      brideName: "Divya",
      groomName: "Kiran",
      eventDate: new Date("2024-09-14"),
      location: "Marriott Hyderabad",
      coverImageCDN: `https://images.unsplash.com/photo-${unsplashCovers[4]}?w=1200&q=85`,
      photographers: [amit._id, priyaNair._id],
      status: "completed",
      photosCount: 756,
      videosCount: 9,
      viewsCount: 387,
      faceMatchCount: 78,
      storageUsed: 3_780_000_000,
      description: "A magnificent Telugu wedding spanning three days.",
      tags: ["telugu", "hyderabad", "3-day"],
      createdBy: admin._id,
    },
    {
      title: "Sneha & Vikram Wedding",
      brideName: "Sneha",
      groomName: "Vikram",
      eventDate: new Date("2025-01-18"),
      location: "Oberoi Udaivilas, Udaipur",
      coverImageCDN: `https://images.unsplash.com/photo-${unsplashCovers[5]}?w=1200&q=85`,
      photographers: [rahul._id],
      status: "upcoming",
      photosCount: 0,
      videosCount: 0,
      viewsCount: 67,
      faceMatchCount: 0,
      storageUsed: 0,
      description: "A dreamy Rajasthani palace wedding at the Oberoi Udaivilas.",
      tags: ["rajasthan", "palace", "udaipur", "destination"],
      createdBy: admin._id,
    },
    {
      title: "Ananya & Dev Reception",
      brideName: "Ananya",
      groomName: "Dev",
      eventDate: new Date("2024-08-05"),
      location: "The Westin, Kolkata",
      coverImageCDN: `https://images.unsplash.com/photo-${unsplashCovers[6]}?w=1200&q=85`,
      photographers: [deepak._id, sunita._id],
      status: "completed",
      photosCount: 521,
      videosCount: 7,
      viewsCount: 267,
      faceMatchCount: 55,
      storageUsed: 2_610_000_000,
      description: "Bengali wedding traditions meet modern luxury at The Westin.",
      tags: ["bengali", "kolkata", "westin"],
      createdBy: admin._id,
    },
    {
      title: "Riya & Aditya Wedding",
      brideName: "Riya",
      groomName: "Aditya",
      eventDate: new Date("2025-02-14"),
      location: "Four Seasons, Pune",
      coverImageCDN: `https://images.unsplash.com/photo-${unsplashCovers[7]}?w=1200&q=85`,
      photographers: [amit._id],
      status: "upcoming",
      photosCount: 0,
      videosCount: 0,
      viewsCount: 89,
      faceMatchCount: 0,
      storageUsed: 0,
      description: "A Valentine's Day wedding at the luxurious Four Seasons Pune.",
      tags: ["valentines", "pune", "four-seasons"],
      createdBy: admin._id,
    },
  ];

  // Attach slug + shareUrl
  const eventsWithSlug = eventsData.map((e, i) => {
    const year = new Date(e.eventDate).getFullYear();
    const suffixes = ["x4k2", "m8n3", "p9q1", "r7s5", "t2u6", "v1w9", "y3z8", "q6p4"];
    const s = slug(e.brideName, e.groomName, year, suffixes[i]);
    return { ...e, slug: s, shareUrl: `${APP}/event/${s}` };
  });

  const events = await Event.insertMany(eventsWithSlug);
  console.log(`📅  Seeded ${events.length} events`);

  // ── 3. Photos (for completed events) ─────────────────────────────────────
  const completedEvents = events.filter(
    (e) => e.status === "completed" || e.status === "live"
  );

  const photosDocs = [];
  for (const ev of completedEvents) {
    const count = ev.photosCount > 0 ? Math.min(ev.photosCount, 30) : 0;
    for (let i = 0; i < count; i++) {
      const cdnUrl = randomPhoto();
      photosDocs.push({
        eventId: ev._id,
        filename: `photo-${i + 1}-${ev.slug}.jpg`,
        originalName: `DSC_${String(1000 + i).padStart(4, "0")}.jpg`,
        storagePath: `events/${ev._id}/photos/photo-${i + 1}.jpg`,
        cdnUrl,
        thumbnailUrl: cdnUrl.replace("w=800", "w=300"),
        width: [1920, 2400, 3000, 4000][i % 4],
        height: [1280, 1600, 2000, 2667][i % 4],
        size: Math.floor(Math.random() * 5_000_000) + 800_000,
        mimeType: "image/jpeg",
        uploadedBy: ev.photographers[0] ?? admin._id,
        favorites: Math.floor(Math.random() * 30),
        downloads: Math.floor(Math.random() * 15),
        isProcessed: true,
        hasFaces: i % 3 !== 0,
        faceCount: i % 3 !== 0 ? Math.floor(Math.random() * 5) + 1 : 0,
        tags: ["wedding", ev.brideName.toLowerCase(), ev.groomName.toLowerCase()],
      });
    }
  }

  if (photosDocs.length) {
    await Photo.insertMany(photosDocs);
    console.log(`🖼️   Seeded ${photosDocs.length} photos across ${completedEvents.length} events`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅  Seeding complete!\n");
  console.log("📋  Login credentials:");
  console.log("    Admin        → admin@memorablepictures.com   / Admin@2024");
  console.log("    Photographer → rahul@memorablepictures.com   / Rahul@2024");
  console.log("    Photographer → sunita@memorablepictures.com  / Sunita@2024");
  console.log("    Photographer → amit@memorablepictures.com    / Amit@2024");
  console.log("\n🔗  Open the app → http://localhost:3000\n");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌  Seed failed:", err.message);
  process.exit(1);
});
