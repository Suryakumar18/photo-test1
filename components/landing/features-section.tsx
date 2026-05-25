"use client";

import { motion } from "framer-motion";
import {
  Brain,
  Camera,
  CloudUpload,
  Download,
  Globe,
  Heart,
  QrCode,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Brain,
    title: "AI Face Recognition",
    description:
      "Upload a selfie and instantly find every photo you appear in from thousands of wedding photos.",
    gradient: "from-violet-500 to-purple-600",
    delay: 0,
  },
  {
    icon: QrCode,
    title: "QR Code Access",
    description:
      "Guests scan a unique QR code to access the event gallery. No app download required.",
    gradient: "from-rose-500 to-pink-600",
    delay: 0.1,
  },
  {
    icon: CloudUpload,
    title: "Live Auto Upload",
    description:
      "Photographers upload in real-time. Photos appear in the guest gallery within seconds.",
    gradient: "from-blue-500 to-cyan-600",
    delay: 0.2,
  },
  {
    icon: Zap,
    title: "CDN-Powered Speed",
    description:
      "Global CDN delivery ensures lightning-fast photo loading from anywhere in the world.",
    gradient: "from-amber-500 to-yellow-600",
    delay: 0.3,
  },
  {
    icon: Download,
    title: "Instant Downloads",
    description:
      "Download individual photos or batch-export entire albums as a ZIP file in one click.",
    gradient: "from-green-500 to-emerald-600",
    delay: 0.4,
  },
  {
    icon: Heart,
    title: "Favorites & Sharing",
    description:
      "Guests can heart their favorite shots and share directly to social media or WhatsApp.",
    gradient: "from-red-500 to-rose-600",
    delay: 0.5,
  },
  {
    icon: Shield,
    title: "Private & Secure",
    description:
      "Password-protected events, signed CDN URLs, and role-based access for full control.",
    gradient: "from-slate-500 to-gray-600",
    delay: 0.6,
  },
  {
    icon: Globe,
    title: "Beautiful Galleries",
    description:
      "Pinterest-style masonry gallery with fullscreen viewer, keyboard navigation, and slideshow.",
    gradient: "from-teal-500 to-cyan-600",
    delay: 0.7,
  },
  {
    icon: Sparkles,
    title: "AI Smart Tags",
    description:
      "Automatically tag photos by scene, emotion, and objects. Smart search across your entire event.",
    gradient: "from-orange-500 to-amber-600",
    delay: 0.8,
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-wider mb-3 block">
            Everything You Need
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Built for Wedding
            <span className="text-primary"> Photographers</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            A complete platform that handles everything from event creation to photo delivery with
            intelligent AI at every step.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: feature.delay }}
            >
              <Card className="group hover-lift border border-border/50 bg-card/50 backdrop-blur-sm h-full">
                <CardContent className="p-6">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
