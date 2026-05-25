"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Check,
  Copy,
  Eye,
  EyeOff,
  Filter,
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  X,
  Zap,
} from "lucide-react";
import { useSuperAdminStore } from "@/store/super-admin-store";
import { StudioCard } from "@/components/super-admin/studio-card";
import toast from "react-hot-toast";
import { formatBytes } from "@/lib/utils";

interface Studio {
  studioId: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  plan: string;
  status: string;
  storageUsed: number;
  storageLimit: number;
  photosCount: number;
  eventsCount: number;
  lastActivity?: string;
  createdAt: string;
}

interface AdminCredentials {
  email: string;
  password: string;
  studioId: string;
  loginUrl: string;
}

async function fetchStudios(token: string | null, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/super-admin/studios?${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function StudiosPage() {
  const { token } = useSuperAdminStore();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [storageModal, setStorageModal] = useState<Studio | null>(null);
  const [storageInput, setStorageInput] = useState("");
  const [storageUnit, setStorageUnit] = useState<"GB" | "MB">("GB");
  const [credentials, setCredentials] = useState<AdminCredentials | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Create form state
  const [form, setForm] = useState({
    name: "",
    ownerName: "",
    ownerEmail: "",
    phone: "",
    plan: "trial",
    storageLimit: 5,
    adminPassword: "",
    allowFaceMatch: true,
    allowPublicGallery: true,
    planPrice: 0,   // ₹ per 28-day billing cycle
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["studios", search, statusFilter, planFilter],
    queryFn: () =>
      fetchStudios(token, {
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(planFilter && { plan: planFilter }),
        limit: "50",
      }),
    enabled: !!token,
  });

  const suspendMutation = useMutation({
    mutationFn: async (studio: Studio) => {
      const res = await fetch(`/api/super-admin/studios/${studio.studioId}/suspend`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (d) => {
      toast.success(d.data.message);
      qc.invalidateQueries({ queryKey: ["studios"] });
    },
    onError: () => toast.error("Action failed"),
  });

  const storageMutation = useMutation({
    mutationFn: async ({ studioId, storageLimit }: { studioId: string; storageLimit: number }) => {
      const res = await fetch(`/api/super-admin/studios/${studioId}/storage`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ storageLimit }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Storage limit updated");
      setStorageModal(null);
      setStorageInput("");
      qc.invalidateQueries({ queryKey: ["studios"] });
    },
    onError: () => toast.error("Failed to update storage"),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/super-admin/studios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          name: form.name,
          ownerName: form.ownerName,
          ownerEmail: form.ownerEmail,
          phone: form.phone || undefined,
          plan: form.plan,
          storageLimit: form.storageLimit * 1024 * 1024 * 1024,
          adminPassword: form.adminPassword || undefined,
          allowFaceMatch: form.allowFaceMatch,
          allowPublicGallery: form.allowPublicGallery,
          planPrice: form.planPrice,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      return data;
    },
    onSuccess: (d) => {
      setShowCreate(false);
      setForm({
        name: "",
        ownerName: "",
        ownerEmail: "",
        phone: "",
        plan: "trial",
        storageLimit: 5,
        adminPassword: "",
        allowFaceMatch: true,
        allowPublicGallery: true,
        planPrice: 0,
      });
      qc.invalidateQueries({ queryKey: ["studios"] });
      // Show credentials modal
      setCredentials(d.data.adminCredentials);
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create studio"),
  });

  const handleSetStorage = () => {
    if (!storageModal || !storageInput) return;
    const bytes = parseFloat(storageInput) * (storageUnit === "GB" ? 1024 ** 3 : 1024 ** 2);
    storageMutation.mutate({ studioId: storageModal.studioId, storageLimit: bytes });
  };

  const studios: Studio[] = data?.data || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Studios</h1>
            <p className="text-sm text-white/40">{data?.pagination?.total ?? 0} total studios</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 transition-colors border border-white/10"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-violet-500/20"
          >
            <Plus className="w-4 h-4" />
            New Studio
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search by name, ID, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-white/40" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl text-sm text-white py-2.5 px-3 focus:outline-none [&_option]:bg-slate-900"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl text-sm text-white py-2.5 px-3 focus:outline-none [&_option]:bg-slate-900"
          >
            <option value="">All Plans</option>
            <option value="trial">Trial</option>
            <option value="starter">Starter</option>
            <option value="professional">Professional</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Studios Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
          ))}
        </div>
      ) : studios.length === 0 ? (
        <div className="text-center py-20">
          <Building2 className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/40">No studios found</p>
          {search && (
            <button onClick={() => setSearch("")} className="text-violet-400 text-sm mt-2 hover:underline">
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {studios.map((studio, i) => (
            <StudioCard
              key={studio.studioId}
              studio={studio}
              delay={i * 0.04}
              onStorageClick={setStorageModal}
              onSuspendClick={(s) => suspendMutation.mutate(s)}
            />
          ))}
        </div>
      )}

      {/* ── Create Studio Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-violet-400" />
                  <h2 className="text-base font-bold text-white">Create New Studio</h2>
                </div>
                <button onClick={() => setShowCreate(false)} className="text-white/40 hover:text-white p-1 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto scrollbar-thin">
                {/* Studio details */}
                <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">Studio Details</p>
                {(
                  [
                    { key: "name", label: "Studio Name*", placeholder: "Sharma Wedding Studio" },
                    { key: "ownerName", label: "Owner Name*", placeholder: "Rajesh Sharma" },
                    { key: "ownerEmail", label: "Owner Email*", placeholder: "rajesh@studio.com" },
                    { key: "phone", label: "Phone (optional)", placeholder: "+91 9876543210" },
                  ] as const
                ).map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs text-white/50 mb-1.5">{label}</label>
                    <input
                      type={key === "ownerEmail" ? "email" : "text"}
                      placeholder={placeholder}
                      value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors"
                    />
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5">Plan</label>
                    <select
                      value={form.plan}
                      onChange={(e) => {
                        const prices: Record<string, number> = { trial: 0, starter: 2999, professional: 5999, enterprise: 12999 };
                        setForm((f) => ({ ...f, plan: e.target.value, planPrice: prices[e.target.value] ?? 0 }));
                      }}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none [&_option]:bg-slate-900"
                    >
                      <option value="trial">Trial (Free)</option>
                      <option value="starter">Starter — ₹2,999</option>
                      <option value="professional">Professional — ₹5,999</option>
                      <option value="enterprise">Enterprise — ₹12,999</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5">Storage (GB)</label>
                    <input
                      type="number"
                      min={1}
                      value={form.storageLimit}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, storageLimit: parseFloat(e.target.value) || 5 }))
                      }
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                </div>

                {/* Billing price (editable override) */}
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">
                    Plan Price (₹ per 28-day cycle)
                    <span className="ml-1 text-white/25">· auto-set from plan, can override</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.planPrice}
                    onChange={(e) => setForm((f) => ({ ...f, planPrice: Number(e.target.value) || 0 }))}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500/50"
                  />
                </div>

                {/* Admin password */}
                <div className="pt-1">
                  <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-3">
                    Admin Login
                  </p>
                  <label className="block text-xs text-white/50 mb-1.5">
                    Password{" "}
                    <span className="text-white/25">(leave blank to auto-generate)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generated if empty"
                    value={form.adminPassword}
                    onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 font-mono"
                  />
                  <p className="text-[10px] text-white/25 mt-1">
                    Admin logs in at /login with the owner email + this password
                  </p>
                </div>

                {/* Feature toggles */}
                <div className="pt-1">
                  <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-3">
                    Features
                  </p>
                  <div className="space-y-2">
                    {[
                      {
                        key: "allowFaceMatch" as const,
                        label: "AI Face Matching",
                        desc: "Enable face recognition for guests",
                        icon: Zap,
                      },
                      {
                        key: "allowPublicGallery" as const,
                        label: "Public Gallery",
                        desc: "Guests can browse without login",
                        icon: Eye,
                      },
                    ].map(({ key, label, desc, icon: Icon }) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 text-violet-400" />
                          <div>
                            <p className="text-sm text-white">{label}</p>
                            <p className="text-[10px] text-white/30">{desc}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setForm((f) => ({ ...f, [key]: !f[key] }))}
                          className={`relative w-10 h-5 rounded-full transition-colors ${
                            form[key] ? "bg-violet-600" : "bg-white/10"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                              form[key] ? "translate-x-5" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 px-6 py-4 border-t border-white/10">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl text-sm transition-colors border border-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={
                    createMutation.isPending || !form.name || !form.ownerName || !form.ownerEmail
                  }
                  className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-all"
                >
                  {createMutation.isPending ? "Creating..." : "Create Studio"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Credentials Modal (shown once after creation) ──────────────── */}
      <AnimatePresence>
        {credentials && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Green header */}
              <div className="px-6 py-4 bg-emerald-500/10 border-b border-emerald-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <KeyRound className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-base font-bold text-white">Studio Created!</h2>
                </div>
                <p className="text-xs text-emerald-400/80">
                  Save these credentials — the password is shown only once
                </p>
              </div>

              <div className="p-6 space-y-3">
                {/* Studio ID */}
                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                  <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider">Studio ID</p>
                    <p className="text-sm font-mono font-bold text-violet-400">{credentials.studioId}</p>
                  </div>
                  <CopyButton text={credentials.studioId} />
                </div>

                {/* Email */}
                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                  <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider">Login Email</p>
                    <p className="text-sm text-white">{credentials.email}</p>
                  </div>
                  <CopyButton text={credentials.email} />
                </div>

                {/* Password */}
                <div className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                  <div>
                    <p className="text-[10px] text-amber-400/70 uppercase tracking-wider">
                      Password · shown once
                    </p>
                    <p className={`text-sm font-mono font-bold text-amber-300 mt-0.5 ${!showPassword && "blur-sm select-none"}`}>
                      {credentials.password}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <CopyButton text={credentials.password} />
                  </div>
                </div>

                {/* Login URL */}
                <p className="text-center text-xs text-white/30">
                  Admin login URL:{" "}
                  <span className="text-white/50 font-mono">
                    {typeof window !== "undefined" ? window.location.origin : ""}/login
                  </span>
                </p>

                <button
                  onClick={() => { setCredentials(null); setShowPassword(false); }}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl text-sm font-medium transition-all mt-2"
                >
                  I&apos;ve saved the credentials
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Storage Modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {storageModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white">Set Storage Limit</h2>
                <button
                  onClick={() => { setStorageModal(null); setStorageInput(""); }}
                  className="text-white/40 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-sm font-medium text-white">{storageModal.name}</p>
                <p className="text-xs text-white/40 font-mono">{storageModal.studioId}</p>
                <p className="text-xs text-white/40 mt-1">
                  Current: {formatBytes(storageModal.storageUsed)} /{" "}
                  {formatBytes(storageModal.storageLimit)}
                </p>
              </div>

              <label className="block text-xs text-white/50 mb-2">New Storage Limit</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="number"
                  min={1}
                  placeholder="Enter value"
                  value={storageInput}
                  onChange={(e) => setStorageInput(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50"
                />
                <select
                  value={storageUnit}
                  onChange={(e) => setStorageUnit(e.target.value as "GB" | "MB")}
                  className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none [&_option]:bg-slate-900"
                >
                  <option value="GB">GB</option>
                  <option value="MB">MB</option>
                </select>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-4">
                {[5, 10, 25, 50, 100, 200].slice(0, 4).map((gb) => (
                  <button
                    key={gb}
                    onClick={() => { setStorageInput(String(gb)); setStorageUnit("GB"); }}
                    className="py-1.5 text-xs bg-white/5 hover:bg-violet-500/10 text-white/60 hover:text-violet-400 rounded-lg border border-white/10 hover:border-violet-500/30 transition-all"
                  >
                    {gb} GB
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setStorageModal(null); setStorageInput(""); }}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl text-sm border border-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetStorage}
                  disabled={!storageInput || storageMutation.isPending}
                  className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {storageMutation.isPending ? "Saving..." : "Apply Limit"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
