"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, Check, CheckCircle2, ChevronDown, ChevronRight,
  Clock, CreditCard, Download, FileText, IndianRupee,
  Loader2, Printer, RefreshCw, Search, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useSuperAdminStore } from "@/store/super-admin-store";
import {
  BILLING_STATUS_COLOR,
  BILLING_STATUS_LABEL,
  type BillingStatus,
} from "@/lib/billing";
import toast from "react-hot-toast";

// ─── Types ─────────────────────────────────────────────────────────────────
interface Invoice {
  _id: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  amount: number;
  paidAmount?: number;
  status: "pending" | "paid" | "overdue";
  paidAt?: string;
  transactionId?: string;
  markedPaidBy?: string;
}

interface StudioBilling {
  studioId: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  plan: string;
  status: string;
  billing: { planPrice: number; nextDueDate: string; lastPaidDate?: string; billingCycleDays: number };
  billingStatus: BillingStatus;
  daysUntilDue: number;
  latestInvoice: Invoice | null;
}

interface Summary { total: number; active: number; due_soon: number; overdue: number; suspended: number }

// ─── Helpers ───────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtINR(n: number | undefined | null) { return `₹${(n ?? 0).toLocaleString("en-IN")}`; }

const FILTER_TABS = ["all", "due_soon", "overdue", "suspended", "active"] as const;
type FilterTab = typeof FILTER_TABS[number];

// ─── Mark-paid modal ───────────────────────────────────────────────────────
function MarkPaidModal({
  studio,
  invoices,
  onClose,
  onSuccess,
  token,
}: {
  studio: StudioBilling;
  invoices: Invoice[];
  onClose: () => void;
  onSuccess: () => void;
  token: string;
}) {
  const [txnId, setTxnId] = useState("");
  const [amount, setAmount] = useState(String(studio.billing?.planPrice || ""));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const pendingInv = invoices.find((i) => i.status === "pending" || i.status === "overdue");

  const handleSubmit = async () => {
    if (!txnId.trim()) { toast.error("Transaction ID is required"); return; }
    if (!amount || Number(amount) <= 0) { toast.error("Valid amount is required"); return; }

    setSaving(true);
    try {
      const res = await fetch(`/api/super-admin/billing/${studio.studioId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "mark_paid",
          transactionId: txnId.trim(),
          paidAmount: Number(amount),
          invoiceId: pendingInv?._id,
          notes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Payment recorded! Next invoice generated.");
        onSuccess();
        onClose();
      } else {
        toast.error(json.error || "Failed");
      }
    } catch { toast.error("Network error"); }
    finally { setSaving(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 16 }}
        className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Mark Payment Received</h3>
            <p className="text-sm text-white/50">{studio.name} · {studio.studioId}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {pendingInv && (
          <div className="bg-white/5 rounded-xl p-4 space-y-2 text-sm">
            <p className="font-medium text-white/80">Pending Invoice</p>
            <div className="flex justify-between text-white/60">
              <span>{pendingInv.invoiceNumber}</span>
              <span className="font-semibold text-white">{fmtINR(pendingInv.amount)}</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Due Date</span>
              <span>{fmtDate(pendingInv.dueDate)}</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label className="text-white/70 text-sm mb-1.5 block">Transaction ID *</Label>
            <Input
              value={txnId}
              onChange={(e) => setTxnId(e.target.value)}
              placeholder="e.g. UPI123456789 or NEFT987654"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
          <div>
            <Label className="text-white/70 text-sm mb-1.5 block">Amount Received (₹) *</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
          <div>
            <Label className="text-white/70 text-sm mb-1.5 block">Notes (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid via UPI on 15 Jan"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <Button variant="outline" className="flex-1 border-white/10 text-white/70 hover:bg-white/5" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1 gap-2 bg-violet-600 hover:bg-violet-700" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Saving…" : "Confirm Payment"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Studio detail row (expandable) ───────────────────────────────────────
function StudioRow({
  studio,
  token,
  onRefresh,
}: {
  studio: StudioBilling;
  token: string;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPaid, setShowPaid] = useState(false);

  const loadInvoices = useCallback(async () => {
    if (invoices.length) return; // already loaded
    setLoading(true);
    try {
      const res = await fetch(`/api/super-admin/billing/${studio.studioId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setInvoices(json.data.invoices ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [studio.studioId, token, invoices.length]);

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) loadInvoices();
  };

  const colorClass = BILLING_STATUS_COLOR[studio.billingStatus];
  const isUrgent = studio.billingStatus === "overdue" || studio.billingStatus === "suspended";

  const handlePrint = (inv: Invoice) => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>${inv.invoiceNumber}</title>
      <style>body{font-family:sans-serif;padding:40px;max-width:600px;margin:auto}
      table{width:100%;border-collapse:collapse;margin:24px 0}
      th,td{padding:10px;border:1px solid #e5e7eb;font-size:14px}th{background:#f9fafb}
      @media print{body{padding:0}}</style></head><body>
      <h2>${inv.invoiceNumber}</h2>
      <p>${studio.name} · ${studio.ownerEmail}</p>
      <table>
        <tr><th>Period</th><td>${fmtDate(inv.periodStart)} – ${fmtDate(inv.periodEnd)}</td></tr>
        <tr><th>Due Date</th><td>${fmtDate(inv.dueDate)}</td></tr>
        <tr><th>Amount</th><td>₹${(inv.amount ?? 0).toLocaleString("en-IN")}</td></tr>
        <tr><th>Status</th><td>${inv.status.toUpperCase()}</td></tr>
        ${inv.transactionId ? `<tr><th>Transaction ID</th><td>${inv.transactionId}</td></tr>` : ""}
        ${inv.paidAt ? `<tr><th>Paid On</th><td>${fmtDate(inv.paidAt)}</td></tr>` : ""}
      </table>
      <script>window.print();window.close();</script></body></html>`);
    win.document.close();
  };

  return (
    <>
      <div
        className={`flex items-center gap-4 p-4 rounded-xl border transition-colors cursor-pointer
          ${isUrgent
            ? "border-red-500/30 bg-red-500/5 hover:bg-red-500/10"
            : "border-white/8 bg-white/3 hover:bg-white/6"}`}
        onClick={handleExpand}
      >
        {/* Status dot */}
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
          studio.billingStatus === "active"    ? "bg-green-500" :
          studio.billingStatus === "due_soon"  ? "bg-amber-400 animate-pulse" :
          studio.billingStatus === "overdue"   ? "bg-orange-500 animate-pulse" :
                                                 "bg-red-500 animate-pulse"}`}
        />

        {/* Studio name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{studio.name}</p>
          <p className="text-xs text-white/40">{studio.ownerEmail}</p>
        </div>

        {/* Plan price */}
        <div className="text-right shrink-0 hidden sm:block">
          <p className="text-sm font-bold text-white">{fmtINR(studio.billing?.planPrice ?? 0)}</p>
          <p className="text-xs text-white/40">/28 days</p>
        </div>

        {/* Due date */}
        <div className="text-right shrink-0 hidden md:block">
          <p className="text-xs text-white/60">
            {studio.daysUntilDue >= 0 ? `Due in ${studio.daysUntilDue}d` : `${Math.abs(studio.daysUntilDue)}d overdue`}
          </p>
          <p className="text-xs text-white/40">{studio.billing?.nextDueDate ? fmtDate(studio.billing.nextDueDate) : "—"}</p>
        </div>

        {/* Status badge */}
        <Badge className={`text-xs border shrink-0 ${colorClass}`}>
          {BILLING_STATUS_LABEL[studio.billingStatus]}
        </Badge>

        {/* Mark paid quick action */}
        {(studio.billingStatus === "due_soon" || studio.billingStatus === "overdue" || studio.billingStatus === "suspended") && (
          <Button
            size="sm"
            className="gap-1 bg-violet-600 hover:bg-violet-700 shrink-0 h-7 text-xs"
            onClick={(e) => { e.stopPropagation(); setShowPaid(true); loadInvoices(); }}
          >
            <CreditCard className="w-3 h-3" /> Pay
          </Button>
        )}

        {/* Expand arrow */}
        {expanded
          ? <ChevronDown className="w-4 h-4 text-white/30 shrink-0" />
          : <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
        }
      </div>

      {/* Expanded invoice list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="ml-6 pl-4 border-l border-white/8 pb-2 space-y-2 mt-1">
              {loading && <div className="py-3 text-center text-white/40 text-xs flex items-center gap-2 justify-center"><Loader2 className="w-3 h-3 animate-spin" /> Loading invoices…</div>}
              {!loading && invoices.length === 0 && (
                <div className="py-3 text-white/30 text-xs">No invoices yet.</div>
              )}
              {invoices.map((inv) => (
                <div key={inv._id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/3 hover:bg-white/6 transition-colors">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    inv.status === "paid" ? "bg-green-500" : inv.status === "overdue" ? "bg-red-500" : "bg-amber-400"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-white/80">{inv.invoiceNumber}</p>
                    <p className="text-xs text-white/40">{fmtDate(inv.periodStart)} – {fmtDate(inv.periodEnd)}</p>
                    {inv.transactionId && <p className="text-xs text-white/30">Txn: {inv.transactionId}</p>}
                  </div>
                  <span className="text-xs font-semibold text-white/80 shrink-0">{fmtINR(inv.paidAmount ?? inv.amount)}</span>
                  <Badge
                    variant={inv.status === "paid" ? "green" : inv.status === "overdue" ? "destructive" : "outline"}
                    className="text-xs shrink-0"
                  >
                    {inv.status}
                  </Badge>
                  <button
                    onClick={() => handlePrint(inv)}
                    className="p-1 hover:bg-white/10 rounded transition-colors shrink-0"
                    title="Print"
                  >
                    <Printer className="w-3 h-3 text-white/40" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mark paid modal */}
      <AnimatePresence>
        {showPaid && (
          <MarkPaidModal
            studio={studio}
            invoices={invoices}
            token={token}
            onClose={() => setShowPaid(false)}
            onSuccess={() => { setInvoices([]); onRefresh(); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────
export default function SuperAdminBillingPage() {
  const { token } = useSuperAdminStore();
  const [studios, setStudios] = useState<StudioBilling[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, active: 0, due_soon: 0, overdue: 0, suspended: 0 });
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const q = new URLSearchParams({ filter, search, limit: "50" });
      const res = await fetch(`/api/super-admin/billing?${q}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setStudios(json.data);
        setSummary(json.summary);
      }
    } catch { toast.error("Failed to load billing data"); }
    finally { setLoading(false); }
  }, [token, filter, search]);

  useEffect(() => { load(); }, [load]);

  const summaryCards = [
    { label: "Total Studios", value: summary.total, icon: FileText,    color: "text-white/70" },
    { label: "Active",        value: summary.active,    icon: CheckCircle2, color: "text-green-400" },
    { label: "Due Soon",      value: summary.due_soon,  icon: Clock,        color: "text-amber-400" },
    { label: "Overdue",       value: summary.overdue,   icon: AlertTriangle,color: "text-orange-400" },
    { label: "Suspended",     value: summary.suspended, icon: X,            color: "text-red-400" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Billing Management</h1>
          <p className="text-sm text-white/40 mt-0.5">Track payments and manage studio subscriptions</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-white/10 text-white/60 hover:bg-white/5"
          onClick={load}
          disabled={loading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {summaryCards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-white/8 bg-white/3">
              <CardContent className="p-4 flex flex-col gap-1">
                <c.icon className={`w-4 h-4 ${c.color}`} />
                <p className="text-2xl font-bold text-white">{c.value}</p>
                <p className="text-xs text-white/40">{c.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {FILTER_TABS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filter === f
                  ? "bg-violet-600 text-white"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              {f === "all" ? "All" : BILLING_STATUS_LABEL[f as BillingStatus]}
              {f !== "all" && (
                <span className="ml-1.5 text-white/40">
                  {summary[f as keyof Summary]}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search studios…"
            className="pl-8 h-8 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>
      </div>

      {/* Studio list */}
      <Card className="border-white/8 bg-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white/60 flex items-center gap-2">
            <IndianRupee className="w-4 h-4" />
            Studios · {studios.length} shown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && (
            <div className="py-16 flex items-center justify-center gap-2 text-white/30">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          )}
          {!loading && studios.length === 0 && (
            <div className="py-16 text-center text-white/30 text-sm">
              No studios match this filter.
            </div>
          )}
          {!loading && studios.map((s) => (
            <StudioRow key={s.studioId} studio={s} token={token!} onRefresh={load} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
