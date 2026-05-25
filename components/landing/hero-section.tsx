"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Camera, Play, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const floatingPhotos = [
  {
    src: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400&q=80",
    className: "top-20 left-[5%] w-40 h-52 rotate-[-8deg]",
    delay: 0,
  },
  {
    src: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400&q=80",
    className: "top-32 right-[5%] w-44 h-56 rotate-[6deg]",
    delay: 0.2,
  },
  {
    src: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&q=80",
    className: "bottom-20 left-[8%] w-36 h-48 rotate-[5deg]",
    delay: 0.4,
  },
  {
    src: "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&q=80",
    className: "bottom-32 right-[8%] w-40 h-52 rotate-[-4deg]",
    delay: 0.6,
  },
];

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-background to-amber-500/5" />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Floating photo cards */}
      {floatingPhotos.map((photo, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 40, rotate: 0 }}
          animate={{ opacity: 1, y: 0, rotate: parseInt(photo.className.match(/rotate-\[?(-?\d+)/)?.[1] || "0") }}
          transition={{ duration: 0.8, delay: photo.delay + 0.5, ease: "easeOut" }}
          className={`absolute hidden lg:block ${photo.className} z-10`}
        >
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut" }}
            className="w-full h-full rounded-2xl overflow-hidden shadow-2xl ring-2 ring-white/20"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.src} alt="Wedding" className="w-full h-full object-cover" />
          </motion.div>
        </motion.div>
      ))}

      {/* Main content */}
      <div className="relative z-20 container mx-auto px-4 text-center max-w-4xl pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Badge variant="rose" className="mb-6 px-4 py-1.5 text-sm">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            AI-Powered Wedding Photography Platform
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold leading-tight mb-6"
        >
          Every{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-rose-500 via-pink-500 to-rose-400">
            Moment
          </span>{" "}
          <br />
          Instantly Yours
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          AI-powered face recognition delivers your wedding photos instantly. Scan a QR, snap a
          selfie, and find every photo you're in — like magic.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
        >
          <Link href="/login">
            <Button size="xl" className="gap-2 rounded-2xl shadow-lg shadow-primary/25">
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <Button size="xl" variant="outline" className="gap-2 rounded-2xl">
            <Play className="w-5 h-5 fill-current" />
            Watch Demo
          </Button>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-pink-600 border-2 border-background flex items-center justify-center text-xs font-bold text-white"
                >
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <span>
              <strong className="text-foreground">2,000+</strong> photographers
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            ))}
            <span>
              <strong className="text-foreground">4.9/5</strong> rating
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-primary" />
            <span>
              <strong className="text-foreground">5M+</strong> photos delivered
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
