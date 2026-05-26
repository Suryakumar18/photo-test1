"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Check, Edit2, GripVertical, Loader2, Plus, Save, Sparkles, Trash2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSuperAdminStore } from "@/store/super-admin-store";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface Plan {
  _id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  popular: boolean;
  cta: string;
  active: boolean;
  order: number;
}

const EMPTY_PLAN: Omit<Plan, "_id"> = {
  name: "", price: 0, period: "/month", description: "",
  features: [], popular: false, cta: "Get Started", active: true, order: 99,
};

export default function PlansPage() {
  const { token } = useSuperAdminStore();
  const [plans, setPlans]       = useState<Plan[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState<Plan | null>(null);
  const [isNew, setIsNew]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [newFeature, setNewFeature] = useState("");

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/plans");
      const j = await r.json();
      if (j.success) setPlans(j.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, []);

  const openNew = () => {
    setEditing({ ...EMPTY_PLAN, _id: "" });
    setIsNew(true);
  };

  const openEdit = (plan: Plan) => {
    setEditing({ ...plan });
    setIsNew(false);
  };

  const cancel = () => { setEditing(null); setIsNew(false); setNewFeature(""); };

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim() || editing.price < 0) {
      toast.error("Name and valid price are required"); return;
    }
    setSaving(true);
    try {
      const url  = isNew ? "/api/plans" : `/api/plans/${editing._id}`;
      const meth = isNew ? "POST" : "PATCH";
      const r = await fetch(url, {
        method: meth,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editing),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
      toast.success(isNew ? "Plan created!" : "Plan updated!");
      cancel();
      fetchPlans();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (id: string) => {
    if (!confirm("Delete this plan?")) return;
    try {
      const r = await fetch(`/api/plans/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
      toast.success("Plan deleted");
      fetchPlans();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const addFeature = () => {
    const f = newFeature.trim();
    if (!f || !editing) return;
    setEditing({ ...editing, features: [...editing.features, f] });
    setNewFeature("");
  };

  const removeFeature = (i: number) => {
    if (!editing) return;
    setEditing({ ...editing, features: editing.features.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Pricing Plans</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Edit plans shown on the public pricing page
          </p>
        </div>
        <Button onClick={openNew} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Plan
        </Button>
      </div>

      {/* ── Editor ───────────────────────────────────────────────────────── */}
      {editing && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{isNew ? "New Plan" : `Edit: ${editing.name}`}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label>Plan Name</Label>
                <Input value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. Professional" />
              </div>
              {/* Price */}
              <div className="space-y-1.5">
                <Label>Price (₹)</Label>
                <Input type="number" value={editing.price}
                  onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                  placeholder="2999" />
              </div>
              {/* Description */}
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Short tagline" />
              </div>
              {/* CTA */}
              <div className="space-y-1.5">
                <Label>Button Text</Label>
                <Input value={editing.cta}
                  onChange={(e) => setEditing({ ...editing, cta: e.target.value })}
                  placeholder="Get Started" />
              </div>
              {/* Period */}
              <div className="space-y-1.5">
                <Label>Billing Period</Label>
                <Input value={editing.period}
                  onChange={(e) => setEditing({ ...editing, period: e.target.value })}
                  placeholder="/month" />
              </div>
              {/* Order */}
              <div className="space-y-1.5">
                <Label>Display Order</Label>
                <Input type="number" value={editing.order}
                  onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })} />
              </div>
            </div>

            {/* Toggles */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={editing.popular}
                  onChange={(e) => setEditing({ ...editing, popular: e.target.checked })}
                  className="w-4 h-4 accent-primary" />
                <span className="text-sm font-medium">Mark as Popular</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={editing.active}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                  className="w-4 h-4 accent-primary" />
                <span className="text-sm font-medium">Active (visible)</span>
              </label>
            </div>

            {/* Features */}
            <div className="space-y-2">
              <Label>Features</Label>
              <div className="flex flex-wrap gap-2">
                {editing.features.map((f, i) => (
                  <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    <Check className="w-3 h-3" />
                    {f}
                    <button onClick={() => removeFeature(i)} className="ml-1 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={newFeature} onChange={(e) => setNewFeature(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addFeature()}
                  placeholder="Add a feature and press Enter" className="flex-1" />
                <Button variant="outline" size="sm" onClick={addFeature}>Add</Button>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={save} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Plan
              </Button>
              <Button variant="outline" onClick={cancel}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Plans list ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan, i) => (
            <motion.div key={plan._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={cn("relative", plan.popular && "border-primary/50")}>
                {plan.popular && (
                  <div className="absolute -top-2.5 left-4">
                    <Badge className="bg-primary text-primary-foreground text-[10px] px-2">
                      <Sparkles className="w-2.5 h-2.5 mr-1" /> Popular
                    </Badge>
                  </div>
                )}
                <CardContent className="pt-6 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-base">{plan.name}</p>
                      <p className="text-xs text-muted-foreground">{plan.description}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => openEdit(plan)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deletePlan(plan._id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-2xl font-bold mb-1">₹{plan.price.toLocaleString("en-IN")}<span className="text-sm text-muted-foreground font-normal">{plan.period}</span></p>

                  <ul className="space-y-1 mt-3">
                    {plan.features.slice(0, 4).map((f) => (
                      <li key={f} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-primary shrink-0" />{f}
                      </li>
                    ))}
                    {plan.features.length > 4 && (
                      <li className="text-[11px] text-muted-foreground pl-4.5">
                        +{plan.features.length - 4} more
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
