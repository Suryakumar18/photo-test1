"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera,
  Eye,
  EyeOff,
  Heart,
  Lock,
  Mail,
  Shield,
  Sparkles,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuthStore } from "@/store/auth-store";
import toast from "react-hot-toast";

// Wedding images for the right panel
const galleryImages = [
  {
    src: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=85",
    span: "row-span-2",
    caption: "Priya & Arjun · New Delhi",
  },
  {
    src: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=85",
    span: "",
    caption: "Kavitha & Suresh · Mumbai",
  },
  {
    src: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=85",
    span: "",
    caption: "Meera & Rohan · Bangalore",
  },
  {
    src: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=85",
    span: "row-span-2",
    caption: "Nisha & Raj · Chennai",
  },
  {
    src: "https://images.unsplash.com/photo-1591604021695-0c69b7c05981?w=600&q=85",
    span: "",
    caption: "Divya & Kiran · Hyderabad",
  },
  {
    src: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&q=85",
    span: "",
    caption: "Sneha & Vikram · Udaipur",
  },
];

const stats = [
  { value: "2,000+", label: "Photographers" },
  { value: "5M+",    label: "Photos Delivered" },
  { value: "99.7%",  label: "Face Match Accuracy" },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<"admin" | "photographer">("admin");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      login(data.data.user, data.data.token);
      toast.success(`Welcome back, ${data.data.user.name}!`);
      router.push(data.data.user.role === "admin" ? "/admin" : "/admin/uploads");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── LEFT — Login Form ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col relative">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-5">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <span className="font-bold text-base">Memorable</span>
              <span className="font-bold text-base text-primary"> Pictures</span>
            </div>
          </Link>
          <ThemeToggle />
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-8 py-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            {/* Header */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
                <Shield className="w-3.5 h-3.5" />
                Secure Sign In
              </div>
              <h1 className="text-3xl font-bold mb-2">Welcome back 👋</h1>
              <p className="text-muted-foreground text-sm">
                Sign in to manage your events and photos
              </p>
            </div>

            {/* Role selector */}
            <div className="flex p-1 bg-muted rounded-xl mb-6 gap-1">
              {(["admin", "photographer"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    role === r
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r === "admin" ? "🛡️ Admin" : "📷 Photographer"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-sm font-medium mb-2 block">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail className="w-4 h-4" />}
                  className="h-11"
                  required
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <Link href="#" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-input bg-background pl-10 pr-10 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword
                      ? <EyeOff className="w-4 h-4" />
                      : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" className="w-4 h-4 rounded accent-primary" />
                <span className="text-sm text-muted-foreground">Remember me for 7 days</span>
              </label>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold rounded-xl"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground mt-8">
              © 2024 Memorable Pictures · All rights reserved
            </p>
          </motion.div>
        </div>
      </div>

      {/* ── RIGHT — Gallery Panel ────────────────────────────────────────── */}
      <div className="hidden lg:flex w-[55%] xl:w-[60%] relative overflow-hidden bg-charcoal-dark">
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-950/80 via-black/60 to-black/80 z-10" />

        {/* Photo grid */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-1.5 p-1.5">
          {galleryImages.map((img, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: i * 0.12 }}
              className={`relative overflow-hidden rounded-xl ${img.span}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt={img.caption}
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
              {/* Individual caption */}
              <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-white text-[11px] font-medium truncate">{img.caption}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Overlay content */}
        <div className="relative z-20 flex flex-col justify-between w-full p-10 pointer-events-none">
          {/* Top badge */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="self-start"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-sm font-medium">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              AI-Powered Wedding Photography
            </div>
          </motion.div>

          {/* Bottom content */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {/* Headline */}
            <h2 className="text-4xl xl:text-5xl font-bold text-white mb-3 leading-tight">
              Every moment,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-300 via-pink-300 to-rose-300">
                instantly yours
              </span>
            </h2>
            <p className="text-white/70 text-base mb-8 max-w-sm leading-relaxed">
              Scan a QR code, upload a selfie, and find every photo you appear
              in — powered by AI face recognition.
            </p>

            {/* Stats */}
            <div className="flex gap-6 mb-8">
              {stats.map((s, i) => (
                <div key={i}>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-white/60 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Testimonial */}
            <div className="flex items-start gap-3 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 max-w-sm">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                P
              </div>
              <div className="min-w-0">
                <div className="flex gap-0.5 mb-1">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-white/80 text-xs leading-relaxed">
                  "The face recognition found every photo of me in seconds.
                  Absolutely magical!"
                </p>
                <p className="text-white/50 text-xs mt-1.5 font-medium">
                  Priya Sharma · Bride, Delhi
                </p>
              </div>
            </div>

            {/* Heart row */}
            <div className="flex items-center gap-2 mt-5 text-white/50 text-xs">
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
              Trusted by 2,000+ wedding photographers across India
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
