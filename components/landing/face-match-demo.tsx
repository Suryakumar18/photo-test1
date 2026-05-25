"use client";

import { motion } from "framer-motion";
import { Brain, CheckCircle, Search, Upload, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const steps = [
  {
    icon: Upload,
    title: "Upload Your Selfie",
    description: "Guests take or upload a selfie at the event",
    color: "bg-blue-500",
    delay: 0,
  },
  {
    icon: Search,
    title: "AI Face Scanning",
    description: "Our AI scans thousands of event photos in seconds",
    color: "bg-violet-500",
    delay: 0.2,
  },
  {
    icon: Brain,
    title: "Deep Learning Match",
    description: "Facial embeddings are compared with 99.7% accuracy",
    color: "bg-rose-500",
    delay: 0.4,
  },
  {
    icon: CheckCircle,
    title: "Instant Results",
    description: "Only YOUR photos are shown in a personal gallery",
    color: "bg-green-500",
    delay: 0.6,
  },
];

export function FaceMatchDemo() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Text side */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="rose" className="mb-4">
              <Brain className="w-3.5 h-3.5 mr-1.5" />
              AI Face Recognition
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Find Yourself in{" "}
              <span className="text-primary">Every Photo</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              No more scrolling through hundreds of photos. Our AI instantly finds every picture
              you&apos;re in — from a single selfie. Magic made real.
            </p>

            <div className="space-y-6">
              {steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: step.delay }}
                  className="flex items-start gap-4"
                >
                  <div
                    className={`w-10 h-10 rounded-xl ${step.color} flex items-center justify-center shrink-0 shadow-lg`}
                  >
                    <step.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{step.title}</h4>
                    <p className="text-muted-foreground text-sm">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Visual side */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative bg-gradient-to-br from-rose-500/10 to-violet-500/10 rounded-3xl p-8 border border-border/50">
              {/* Selfie upload mockup */}
              <div className="bg-card rounded-2xl p-6 shadow-xl mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">S</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Scan Your Face</p>
                    <p className="text-xs text-muted-foreground">Upload or take a selfie</p>
                  </div>
                </div>
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Tap to upload selfie</p>
                </div>
              </div>

              {/* Processing animation */}
              <div className="bg-card rounded-2xl p-4 shadow-xl mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-violet-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Scanning 847 photos...</p>
                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-rose-500 to-violet-500 rounded-full"
                        initial={{ width: "0%" }}
                        whileInView={{ width: "100%" }}
                        viewport={{ once: true }}
                        transition={{ duration: 2, delay: 0.5, ease: "easeInOut" }}
                      />
                    </div>
                  </div>
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
              </div>

              {/* Results mockup */}
              <div className="bg-card rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-sm">Your Photos Found!</p>
                  <Badge variant="green" className="text-xs">23 matches</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden bg-muted relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://images.unsplash.com/photo-${i === 1 ? "1519741497674-611481863552" : i === 2 ? "1583939003579-730e3918a45a" : i === 3 ? "1606216794074-735e91aa2c92" : i === 4 ? "1511285560929-80b456fea0bc" : i === 5 ? "1465495976277-4387d4b0b4c6" : "1563729784474-d77dbb933a9e"}?w=200&q=80`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      {i <= 3 && (
                        <div className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
