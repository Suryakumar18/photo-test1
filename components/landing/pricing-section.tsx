"use client";

import { motion } from "framer-motion";
import { Check, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    price: "₹999",
    period: "/month",
    description: "Perfect for freelance photographers",
    features: [
      "5 events per month",
      "500 photos per event",
      "5GB storage",
      "QR code generation",
      "Basic gallery",
      "Email support",
    ],
    cta: "Get Started",
    variant: "outline" as const,
    delay: 0,
    popular: false,
  },
  {
    name: "Professional",
    price: "₹2,999",
    period: "/month",
    description: "For growing photography studios",
    features: [
      "Unlimited events",
      "Unlimited photos",
      "100GB storage",
      "AI face recognition",
      "Live uploads",
      "Custom branding",
      "Analytics dashboard",
      "Priority support",
    ],
    cta: "Start Free Trial",
    variant: "default" as const,
    delay: 0.1,
    popular: true,
  },
  {
    name: "Enterprise",
    price: "₹7,999",
    period: "/month",
    description: "For large studios & agencies",
    features: [
      "Everything in Pro",
      "1TB storage",
      "White-label platform",
      "Custom domain",
      "API access",
      "Dedicated CDN",
      "SLA guarantee",
      "24/7 phone support",
    ],
    cta: "Contact Sales",
    variant: "outline" as const,
    delay: 0.2,
    popular: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-wider mb-3 block">
            Pricing
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, <span className="text-primary">Transparent</span> Pricing
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            No hidden fees. Cancel anytime. Start free for 14 days.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: plan.delay }}
              className={cn(plan.popular && "md:-mt-4 md:mb-4")}
            >
              <Card
                className={cn(
                  "h-full relative",
                  plan.popular
                    ? "border-primary/50 bg-primary/5 shadow-xl shadow-primary/10"
                    : "border-border/50"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      <Sparkles className="w-3.5 h-3.5 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="pt-8 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    {plan.popular && <Zap className="w-4 h-4 text-primary" />}
                    <h3 className="font-bold text-lg">{plan.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="pb-8">
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-sm">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={plan.variant}
                    className="w-full"
                    size="lg"
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
