"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Download, Heart, Expand } from "lucide-react";

const galleryImages = [
  { src: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80", h: "h-64" },
  { src: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80", h: "h-48" },
  { src: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80", h: "h-72" },
  { src: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80", h: "h-56" },
  { src: "https://images.unsplash.com/photo-1591604021695-0c69b7c05981?w=600&q=80", h: "h-64" },
  { src: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&q=80", h: "h-48" },
  { src: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=600&q=80", h: "h-60" },
  { src: "https://images.unsplash.com/photo-1595408076683-5d0c009e71e4?w=600&q=80", h: "h-52" },
];

function PhotoCard({ src, h, delay }: { src: string; h: string; delay: number }) {
  const [liked, setLiked] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className={`${h} relative group overflow-hidden rounded-2xl cursor-pointer`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Wedding"
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={() => setLiked(!liked)}
          className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/40 transition-colors"
        >
          <Heart
            className={`w-4 h-4 ${liked ? "fill-rose-500 text-rose-500" : "text-white"}`}
          />
        </button>
        <div className="flex gap-2">
          <button className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/40 transition-colors">
            <Download className="w-4 h-4 text-white" />
          </button>
          <button className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/40 transition-colors">
            <Expand className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function GalleryShowcase() {
  return (
    <section id="gallery" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-wider mb-3 block">
            Beautiful Galleries
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Your Photos,{" "}
            <span className="text-primary">Beautifully</span> Presented
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Pinterest-style masonry galleries with smooth animations, fullscreen viewing, and
            one-click downloads.
          </p>
        </motion.div>

        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {galleryImages.map((img, i) => (
            <PhotoCard key={i} src={img.src} h={img.h} delay={i * 0.05} />
          ))}
        </div>
      </div>
    </section>
  );
}
