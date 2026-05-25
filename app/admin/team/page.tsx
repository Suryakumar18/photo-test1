"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { useAuthStore } from "@/store/auth-store";
import { getInitials } from "@/lib/utils";
import toast from "react-hot-toast";

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "photographer";
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

interface NewCredentials {
  name: string;
  email: string;
  password: string;
}

const ROLE_GRADIENTS: Record<string, string> = {
  admin: "from-violet-400 to-purple-600",
  photographer: "from-rose-400 to-pink-600",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1.5 rounded-lg hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function TeamPage() {
  const { token } = useAuthStore();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newCreds, setNewCreds] = useState<NewCredentials | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });

  const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const { data, isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const res = await fetch("/api/team", {
        headers: authHeader,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      const d = await res.json();
      return d.data as TeamMember[];
    },
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        credentials: "include",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      return d;
    },
    onSuccess: (d) => {
      setShowCreate(false);
      setForm({ name: "", email: "", phone: "", password: "" });
      qc.invalidateQueries({ queryKey: ["team"] });
      setNewCreds({ name: d.data.user.name, email: d.data.user.email, password: d.data.password });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/team/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        credentials: "include",
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (_, { isActive }) => {
      toast.success(isActive ? "Photographer activated" : "Photographer deactivated");
      qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: () => toast.error("Action failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/team/${id}`, {
        method: "DELETE",
        headers: authHeader,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Photographer removed");
      qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: () => toast.error("Failed to remove"),
  });

  const team = data || [];
  const filtered = team.filter(
    (m) =>
      search === "" ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );

  const admins = filtered.filter((m) => m.role === "admin");
  const photographers = filtered.filter((m) => m.role === "photographer");

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Team" subtitle="Manage photographers and studio members" />

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Actions bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search team..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Photographer
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 rounded-2xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Studio Admins */}
            {admins.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-3">
                  Studio Admin
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {admins.map((member) => (
                    <MemberCard key={member._id} member={member} isAdmin readOnly />
                  ))}
                </div>
              </div>
            )}

            {/* Photographers */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-3">
                Photographers ({photographers.length})
              </p>
              {photographers.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border rounded-2xl">
                  <Camera className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No photographers yet</p>
                  <button
                    onClick={() => setShowCreate(true)}
                    className="text-primary text-sm mt-2 hover:underline"
                  >
                    Add your first photographer
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {photographers.map((member) => (
                    <MemberCard
                      key={member._id}
                      member={member}
                      onToggle={(isActive) =>
                        toggleMutation.mutate({ id: member._id, isActive })
                      }
                      onDelete={() => deleteMutation.mutate(member._id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Add Photographer Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-primary" />
                  <h2 className="text-base font-bold">Add Photographer</h2>
                </div>
                <button
                  onClick={() => setShowCreate(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {[
                  { key: "name", label: "Full Name*", placeholder: "Rahul Mehta", type: "text" },
                  { key: "email", label: "Email*", placeholder: "rahul@studio.com", type: "email" },
                  { key: "phone", label: "Phone (optional)", placeholder: "+91 9876543210", type: "text" },
                ].map(({ key, label, placeholder, type }) => (
                  <div key={key}>
                    <label className="block text-xs text-muted-foreground mb-1.5">{label}</label>
                    <input
                      type={type}
                      placeholder={placeholder}
                      value={form[key as keyof typeof form]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">
                    Password{" "}
                    <span className="text-muted-foreground/50">(auto-generated if blank)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-generate"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm font-mono focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-3 px-6 py-4 border-t border-border">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !form.name || !form.email}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending ? "Creating..." : "Add Photographer"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── New Credentials Modal ───────────────────────────────────── */}
      <AnimatePresence>
        {newCreds && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-card border border-green-500/30 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 bg-green-500/10 border-b border-green-500/20">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-green-500" />
                  <h2 className="text-base font-bold">Photographer Added!</h2>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Share these credentials with {newCreds.name} — password shown once
                </p>
              </div>

              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-xl">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Email</p>
                    <p className="text-sm">{newCreds.email}</p>
                  </div>
                  <CopyButton text={newCreds.email} />
                </div>

                <div className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                  <div>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      Password · once only
                    </p>
                    <p
                      className={`text-sm font-mono font-bold text-amber-600 dark:text-amber-300 mt-0.5 ${
                        !showPassword && "blur-sm select-none"
                      }`}
                    >
                      {newCreds.password}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1.5 rounded-lg hover:bg-foreground/5 text-muted-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <CopyButton text={newCreds.password} />
                  </div>
                </div>

                <button
                  onClick={() => {
                    setNewCreds(null);
                    setShowPassword(false);
                  }}
                  className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-medium transition-colors mt-2"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── MemberCard component ──────────────────────────────────────────────────────

interface MemberCardProps {
  member: TeamMember;
  isAdmin?: boolean;
  readOnly?: boolean;
  onToggle?: (isActive: boolean) => void;
  onDelete?: () => void;
}

function MemberCard({ member, isAdmin = false, readOnly = false, onToggle, onDelete }: MemberCardProps) {
  const gradient = ROLE_GRADIENTS[member.role] || ROLE_GRADIENTS.photographer;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card border rounded-2xl p-5 transition-colors ${
        member.isActive ? "border-border hover:border-primary/30" : "border-border/50 opacity-60"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm shrink-0`}
        >
          {getInitials(member.name)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm truncate">{member.name}</p>
            {!member.isActive && (
              <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">
                Inactive
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Mail className="w-3 h-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
          </div>
          {member.phone && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Phone className="w-3 h-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{member.phone}</p>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground/50 capitalize mt-1">
            {isAdmin ? "Studio Admin" : "Photographer"}
          </p>
        </div>
      </div>

      {!readOnly && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
          <button
            onClick={() => onToggle?.(!member.isActive)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              member.isActive
                ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                : "bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20"
            }`}
          >
            {member.isActive ? (
              <>
                <UserX className="w-3.5 h-3.5" /> Deactivate
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5" /> Activate
              </>
            )}
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
