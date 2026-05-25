"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  {
    name: "Priya & Arjun",
    role: "Wedding Couple",
    avatar: "PA",
    rating: 5,
    text: "We couldn't believe how quickly we found all our photos! The face recognition worked perfectly. Every single guest was able to find their photos within seconds. Absolutely magical!",
    gradient: "from-rose-400 to-pink-600",
    delay: 0,
  },
  {
    name: "Rahul Mehta",
    role: "Wedding Photographer",
    avatar: "RM",
    rating: 5,
    text: "This platform has completely transformed my workflow. Live uploads, automatic organization, and the clients absolutely love the QR code gallery access. My bookings doubled after using this!",
    gradient: "from-violet-400 to-purple-600",
    delay: 0.15,
  },
  {
    name: "Sunita Photography",
    role: "Photography Studio",
    avatar: "SP",
    rating: 5,
    text: "The Bunny CDN integration is blazing fast. Our clients from all over India can view their gallery without any loading delays. The dashboard analytics help us understand our business better.",
    gradient: "from-blue-400 to-cyan-600",
    delay: 0.3,
  },
  {
    name: "Amit & Kavitha",
    role: "Wedding Couple",
    avatar: "AK",
    rating: 5,
    text: "Our wedding had 500 guests and 3000 photos. Every single person was able to find their photos using just their selfie. The platform handled it flawlessly. Highly recommended!",
    gradient: "from-amber-400 to-orange-600",
    delay: 0.45,
  },
  {
    name: "Deepak Studios",
    role: "Event Photographer",
    avatar: "DS",
    rating: 5,
    text: "The QR code feature is genius! No more WhatsApp groups with thousands of photos. Guests just scan and find their photos instantly. Professional and elegant experience for everyone.",
    gradient: "from-green-400 to-emerald-600",
    delay: 0.6,
  },
  {
    name: "Neha Kapoor",
    role: "Bride",
    avatar: "NK",
    rating: 5,
    text: "I was skeptical about AI face recognition but it found every photo I was in at my own wedding! Even photos I didn't know were taken. The gallery download feature was so convenient!",
    gradient: "from-teal-400 to-cyan-600",
    delay: 0.75,
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 bg-muted/20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-wider mb-3 block">
            Testimonials
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Loved by <span className="text-primary">Thousands</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Photographers and couples around the world trust Memorable Pictures for their most
            special moments.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: t.delay }}
            >
              <Card className="h-full border border-border/50 bg-card/50 hover-lift">
                <CardContent className="p-6">
                  <Quote className="w-8 h-8 text-primary/20 mb-4" />
                  <p className="text-sm leading-relaxed text-muted-foreground mb-6">{t.text}</p>
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white text-xs font-bold shrink-0`}
                    >
                      {t.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: t.rating }).map((_, j) => (
                        <Star key={j} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
