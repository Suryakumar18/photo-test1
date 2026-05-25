"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, CheckCircle2, Clock, CreditCard,
  Download, FileText, IndianRupee, Printer,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import {
  BILLING_STATUS_COLOR,
  BILLING_STATUS_LABEL,
  type BillingStatus,
} from "@/lib/billing";
import toast from "react-hot-toast";

interface Invoice {
  _id: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "overdue";
  paidAt?: string;
  transactionId?: string;
  paidAmount?: number;
}

interface BillingData {
  billingStatus: BillingStatus;
  daysUntilDue: number;
  billing: {
    planPrice: number;
    currency: string;
    nextDueDate: string;
    lastPaidDate?: string;
    billingCycleDays: number;
  };
  studio: { name: string; plan: string };
  invoices: Invoice[];
}

function StatusIcon({ status }: { status: BillingStatus }) {
  if (status === "active")    return <CheckCircle2 className="w-5 h-5 text-green-500" />;
  if (status === "suspended") return <AlertTriangle className="w-5 h-5 text-red-500" />;
  return <Clock className="w-5 h-5 text-amber-500" />;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtINR(n: number | undefined | null) {
  return `₹${(n ?? 0).toLocaleString("en-IN")}`;
}

export default function BillingPage() {
  const { token } = useAuthStore();
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("/api/studio/billing", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((j) => { if (j.success) setData(j.data); })
      .catch(() => toast.error("Failed to load billing"))
      .finally(() => setLoading(false));
  }, [token]);

  const handlePrint = (inv: Invoice) => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>${inv.invoiceNumber}</title>
      <style>
        body{font-family:sans-serif;padding:40px;color:#111;max-width:600px;margin:auto}
        h1{font-size:24px;margin-bottom:4px} .sub{color:#666;font-size:13px;margin-bottom:32px}
        table{width:100%;border-collapse:collapse;margin:24px 0}
        th,td{padding:10px 12px;border:1px solid #e5e7eb;text-align:left;font-size:14px}
        th{background:#f9fafb;font-weight:600}
        .total{font-size:18px;font-weight:700;text-align:right;margin-top:16px}
        .badge{display:inline-block;padding:2px 10px;border-radius:99px;font-size:12px;font-weight:600}
        .paid{background:#d1fae5;color:#065f46} .pending{background:#fef3c7;color:#92400e}
        @media print{body{padding:0}}
      </style></head><body>
      <h1>INVOICE</h1>
      <div class="sub">${inv.invoiceNumber}</div>
      <table>
        <tr><th>Studio</th><td>${data?.studio.name ?? ""}</td></tr>
        <tr><th>Billing Period</th><td>${fmtDate(inv.periodStart)} – ${fmtDate(inv.periodEnd)}</td></tr>
        <tr><th>Due Date</th><td>${fmtDate(inv.dueDate)}</td></tr>
        <tr><th>Status</th><td><span class="badge ${inv.status === "paid" ? "paid" : "pending"}">${inv.status.toUpperCase()}</span></td></tr>
        ${inv.transactionId ? `<tr><th>Transaction ID</th><td>${inv.transactionId}</td></tr>` : ""}
        ${inv.paidAt ? `<tr><th>Paid On</th><td>${fmtDate(inv.paidAt)}</td></tr>` : ""}
      </table>
      <div class="total">Total: ₹${(inv.amount ?? 0).toLocaleString("en-IN")}</div>
      <script>window.print();window.close();</script>
      </body></html>
    `);
    win.document.close();
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-full">
        <Topbar title="Billing" subtitle="Subscription & invoices" />
        <div className="p-6 space-y-4 max-w-3xl">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col min-h-full">
        <Topbar title="Billing" subtitle="Subscription & invoices" />
        <div className="p-6">
          <p className="text-muted-foreground text-sm">
            No billing information available. This account may not be linked to a studio.
          </p>
        </div>
      </div>
    );
  }

  const { billingStatus, daysUntilDue, billing, invoices } = data;
  const colorClass = BILLING_STATUS_COLOR[billingStatus];
  const pendingInv = invoices.find((i) => i.status === "pending" || i.status === "overdue");

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Billing" subtitle="Subscription & payment history" />

      <div className="p-6 space-y-6 max-w-3xl">
        {/* ── Status card ─────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className={`border ${colorClass.split(" ")[2]}`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-4 flex-wrap">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${colorClass.split(" ")[1]}`}>
                  <StatusIcon status={billingStatus} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-lg">
                      {BILLING_STATUS_LABEL[billingStatus]}
                    </p>
                    <Badge className={`text-xs border ${colorClass}`}>
                      {billingStatus}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {billingStatus === "active" &&
                      `Next payment due on ${fmtDate(billing.nextDueDate)} (${daysUntilDue} days)`}
                    {billingStatus === "due_soon" &&
                      `Payment due in ${daysUntilDue} days — ${fmtDate(billing.nextDueDate)}`}
                    {billingStatus === "overdue" &&
                      `Payment is overdue by ${Math.abs(daysUntilDue)} days. Contact admin.`}
                    {billingStatus === "suspended" &&
                      "Account suspended. Payment required to continue."}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold">{fmtINR(billing.planPrice)}</p>
                  <p className="text-xs text-muted-foreground">per {billing.billingCycleDays}-day cycle</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Pending invoice CTA ──────────────────────────────────────────── */}
        {pendingInv && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="border border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-5 flex items-center gap-4 flex-wrap">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                  <IndianRupee className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">Pending Invoice: {pendingInv.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    Due {fmtDate(pendingInv.dueDate)} · {fmtINR(pendingInv.amount)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 shrink-0"
                  onClick={() => handlePrint(pendingInv)}
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Invoice
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Invoice history ──────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Invoice History
                <Badge variant="outline" className="ml-auto text-xs">{invoices.length} invoices</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No invoices yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {invoices.map((inv) => (
                    <div
                      key={inv._id}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/40 transition-colors"
                    >
                      {/* Status dot */}
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          inv.status === "paid"
                            ? "bg-green-500"
                            : inv.status === "overdue"
                            ? "bg-red-500"
                            : "bg-amber-400"
                        }`}
                      />

                      {/* Invoice info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium font-mono">{inv.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmtDate(inv.periodStart)} – {fmtDate(inv.periodEnd)}
                        </p>
                        {inv.transactionId && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Txn: {inv.transactionId}
                          </p>
                        )}
                      </div>

                      {/* Amount + status */}
                      <div className="text-right shrink-0 space-y-1">
                        <p className="text-sm font-bold">{fmtINR(inv.paidAmount ?? inv.amount)}</p>
                        <Badge
                          variant={
                            inv.status === "paid"
                              ? "green"
                              : inv.status === "overdue"
                              ? "destructive"
                              : "outline"
                          }
                          className="text-xs"
                        >
                          {inv.status}
                        </Badge>
                      </div>

                      {/* Print */}
                      <button
                        onClick={() => handlePrint(inv)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground shrink-0"
                        title="Print invoice"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Info note ────────────────────────────────────────────────────── */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/30 border border-border/50 text-xs text-muted-foreground">
          <CreditCard className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Payments are processed manually by your platform administrator.
            Once you make a payment, share the transaction ID with them so they can mark your account active.
          </span>
        </div>
      </div>
    </div>
  );
}
