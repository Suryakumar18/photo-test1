"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CreditCard, Phone, Mail, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth-store";
import type { BillingStatus } from "@/lib/billing";

interface BillingData {
  billingStatus: BillingStatus;
  daysUntilDue: number;
  billing: {
    planPrice: number;
    currency: string;
    nextDueDate: string;
    lastPaidDate?: string;
  };
  studio: { name: string; ownerEmail: string };
  invoices: Array<{
    _id: string;
    invoiceNumber: string;
    amount: number;
    status: string;
    dueDate: string;
  }>;
}

// ── Banner shown when payment is due soon ─────────────────────────────────
export function PaymentDueBanner({ data }: { data: BillingData }) {
  const days = data.daysUntilDue;
  const isOverdue = data.billingStatus === "overdue";
  const pendingInv = data.invoices.find((i) => i.status === "pending" || i.status === "overdue");

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 px-4 py-2.5 text-sm border-b ${
        isOverdue
          ? "bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400"
          : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
      }`}
    >
      <Clock className="w-4 h-4 shrink-0" />
      <span className="flex-1">
        {isOverdue
          ? `Payment overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""}.`
          : `Payment due in ${days} day${days !== 1 ? "s" : ""}.`}
        {pendingInv && (
          <span className="font-semibold ml-1">
            ₹{pendingInv.amount.toLocaleString("en-IN")} pending.
          </span>
        )}
        &nbsp;Contact your super admin to process payment.
      </span>
      <Badge
        variant="outline"
        className={`text-xs shrink-0 border ${
          isOverdue ? "border-orange-500/40 text-orange-600" : "border-amber-500/40 text-amber-600"
        }`}
      >
        {isOverdue ? "Overdue" : "Due Soon"}
      </Badge>
    </motion.div>
  );
}

// ── Full-screen wall shown when studio is suspended ───────────────────────
export function PaymentWall({ data }: { data: BillingData }) {
  const pendingInv = data.invoices.find((i) => i.status === "pending" || i.status === "overdue");
  const due = new Date(data.billing.nextDueDate);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-md flex items-center justify-center p-6"
    >
      <div className="max-w-md w-full space-y-6 text-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-2">Account Suspended</h2>
          <p className="text-muted-foreground text-sm">
            Your studio&apos;s access has been suspended due to an overdue payment.
            Please contact your administrator to resume service.
          </p>
        </div>

        {/* Invoice details */}
        <div className="bg-muted/50 border border-border rounded-2xl p-5 text-left space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Payment Details
          </p>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Amount Due</span>
            <span className="font-bold text-lg">
              ₹{(pendingInv?.amount ?? data.billing.planPrice).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Due Date</span>
            <span className="text-sm font-medium">
              {due.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
          {pendingInv && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Invoice</span>
              <span className="text-sm font-mono">{pendingInv.invoiceNumber}</span>
            </div>
          )}
        </div>

        {/* Contact */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Contact your administrator</p>
          <div className="flex flex-col gap-2">
            <a
              href={`mailto:support@memorablepictures.com?subject=Payment for ${data.studio.name}`}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-border hover:bg-muted transition-colors text-sm"
            >
              <Mail className="w-4 h-4 text-primary" />
              support@memorablepictures.com
            </a>
            <div className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-border text-sm text-muted-foreground">
              <Phone className="w-4 h-4" />
              Once paid, super admin will re-enable your account
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <CreditCard className="w-3.5 h-3.5" />
          Payment is processed manually by your super admin
        </div>
      </div>
    </motion.div>
  );
}

// ── Hook + wrapper used inside admin layout ───────────────────────────────
export function PaymentGate({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuthStore();
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!token || !user?.studioId) { setChecked(true); return; }

    fetch("/api/studio/billing", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setBilling(json.data as BillingData);
      })
      .catch(() => {})
      .finally(() => setChecked(true));
  }, [token, user?.studioId]);

  const status = billing?.billingStatus;

  return (
    <>
      {/* Warning banner — shown for due_soon and overdue */}
      <AnimatePresence>
        {billing && (status === "due_soon" || status === "overdue") && (
          <PaymentDueBanner data={billing} />
        )}
      </AnimatePresence>

      {/* Hard wall — shown only when suspended */}
      <AnimatePresence>
        {checked && billing && status === "suspended" && (
          <PaymentWall data={billing} />
        )}
      </AnimatePresence>

      {children}
    </>
  );
}
