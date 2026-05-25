"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  Bell,
  Building2,
  Camera,
  Check,
  Droplets,
  Globe,
  Lock,
  Save,
  Shield,
  Upload,
  User,
  X,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth-store";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────
interface StudioData {
  studioId: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  address: string;
  logo?: string;
  plan: string;
  status: string;
  settings: {
    allowFaceMatch: boolean;
    allowPublicGallery: boolean;
    watermarkEnabled: boolean;
    watermark?: string;
  };
}

// ─── Settings Page ────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, token } = useAuthStore();
  const isAdmin = user?.role === "admin";

  // Studio state
  const [studio, setStudio] = useState<StudioData | null>(null);
  const [loadingStudio, setLoadingStudio] = useState(true);

  // Editable fields
  const [studioName, setStudioName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  // Logo upload
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Watermark toggle
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [togglingWatermark, setTogglingWatermark] = useState(false);

  // Security
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  // ── Fetch studio settings ────────────────────────────────────────────────
  const fetchStudio = useCallback(async () => {
    if (!token || !user?.studioId) {
      setLoadingStudio(false);
      return;
    }
    try {
      const res = await fetch("/api/studio/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        const s: StudioData = json.data;
        setStudio(s);
        setStudioName(s.name ?? "");
        setPhone(s.phone ?? "");
        setAddress(s.address ?? "");
        setLogoPreview(s.logo ?? null);
        setWatermarkEnabled(s.settings?.watermarkEnabled ?? false);
      }
    } catch {
      // ignore
    } finally {
      setLoadingStudio(false);
    }
  }, [token, user?.studioId]);

  useEffect(() => { fetchStudio(); }, [fetchStudio]);

  // ── Save studio info ─────────────────────────────────────────────────────
  const handleSaveStudio = async () => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      const res = await fetch("/api/studio/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: studioName, phone, address }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Studio information saved!");
        setStudio((prev) => prev ? { ...prev, name: studioName, phone, address } : prev);
      } else {
        toast.error(json.error || "Failed to save");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  // ── Logo file picker ─────────────────────────────────────────────────────
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be smaller than 5 MB");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  // ── Upload logo to Bunny CDN ─────────────────────────────────────────────
  const handleUploadLogo = async () => {
    if (!logoFile || !isAdmin) return;
    setUploadingLogo(true);
    try {
      const form = new FormData();
      form.append("file", logoFile);
      const res = await fetch("/api/studio/logo", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Logo uploaded successfully!");
        setLogoPreview(json.data.logoUrl);
        setLogoFile(null);
        // Refresh studio data so sidebar also picks up new logo on next load
        fetchStudio();
      } else {
        toast.error(json.error || "Upload failed");
      }
    } catch {
      toast.error("Upload error");
    } finally {
      setUploadingLogo(false);
    }
  };

  // ── Watermark toggle ─────────────────────────────────────────────────────
  const handleWatermarkToggle = async (enabled: boolean) => {
    if (!isAdmin) return;
    setTogglingWatermark(true);
    // Optimistic update
    setWatermarkEnabled(enabled);
    try {
      const res = await fetch("/api/studio/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ watermarkEnabled: enabled }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          enabled
            ? "Watermark enabled — applied to all studio photos"
            : "Watermark disabled — removed from all photos"
        );
        setStudio((prev) =>
          prev
            ? { ...prev, settings: { ...prev.settings, watermarkEnabled: enabled } }
            : prev
        );
      } else {
        // Roll back
        setWatermarkEnabled(!enabled);
        toast.error(json.error || "Failed to update watermark");
      }
    } catch {
      setWatermarkEnabled(!enabled);
      toast.error("Network error");
    } finally {
      setTogglingWatermark(false);
    }
  };

  // ── Password change ──────────────────────────────────────────────────────
  const handlePasswordChange = async () => {
    if (!newPw || !confirmPw || !currentPw) {
      toast.error("Please fill all password fields");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPw.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSavingPw(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Password updated successfully!");
        setCurrentPw(""); setNewPw(""); setConfirmPw("");
      } else {
        toast.error(json.error || "Failed to update password");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Settings" subtitle="Manage your studio and account settings" />

      <div className="p-6 max-w-4xl">
        <Tabs defaultValue={isAdmin ? "studio" : "profile"}>
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            {isAdmin && (
              <TabsTrigger value="studio" className="gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Studio
              </TabsTrigger>
            )}
            <TabsTrigger value="profile" className="gap-1.5">
              <User className="w-3.5 h-3.5" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="gallery" className="gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              Gallery
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5">
              <Bell className="w-3.5 h-3.5" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* ── Studio Tab (admin only) ────────────────────────────────── */}
          {isAdmin && (
            <TabsContent value="studio" className="space-y-6">
              {/* Studio Info Card */}
              <Card className="border border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    Studio Information
                    {studio && (
                      <Badge variant="outline" className="ml-auto text-xs capitalize">
                        {studio.plan}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingStudio ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-10 bg-muted/50 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <Label className="text-sm mb-2 block">Studio Name</Label>
                          <Input
                            value={studioName}
                            onChange={(e) => setStudioName(e.target.value)}
                            placeholder="Your photography studio name"
                          />
                        </div>
                        <div>
                          <Label className="text-sm mb-2 block">Phone</Label>
                          <Input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+91 98765 43210"
                          />
                        </div>
                        <div>
                          <Label className="text-sm mb-2 block">Address</Label>
                          <Input
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="City, State"
                          />
                        </div>
                      </div>
                      <Button onClick={handleSaveStudio} disabled={saving} className="gap-2">
                        <Save className="w-4 h-4" />
                        {saving ? "Saving…" : "Save Changes"}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Logo Upload Card */}
              <Card className="border border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Camera className="w-4 h-4 text-primary" />
                    Studio Logo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-6">
                    {/* Logo preview */}
                    <div
                      className="w-24 h-24 rounded-2xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30 cursor-pointer shrink-0 hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {logoPreview ? (
                        <Image
                          src={logoPreview}
                          alt="Studio logo"
                          width={96}
                          height={96}
                          className="w-full h-full object-cover"
                          unoptimized={logoPreview.startsWith("blob:")}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <Upload className="w-6 h-6" />
                          <span className="text-xs">Upload</span>
                        </div>
                      )}
                    </div>

                    {/* Upload controls */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Studio Logo</p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG, WebP or SVG. Max 5 MB.<br />
                        This logo is also used as the photo watermark.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Choose File
                        </Button>
                        {logoFile && (
                          <>
                            <Button
                              size="sm"
                              className="gap-1.5"
                              onClick={handleUploadLogo}
                              disabled={uploadingLogo}
                            >
                              {uploadingLogo ? (
                                "Uploading…"
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  Upload
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setLogoFile(null); setLogoPreview(studio?.logo ?? null); }}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                      {logoFile && (
                        <p className="text-xs text-muted-foreground">{logoFile.name}</p>
                      )}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={handleLogoChange}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Watermark Card */}
              <Card className="border border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-primary" />
                    Photo Watermark
                    {/* Live status badge */}
                    <Badge
                      variant={watermarkEnabled ? "green" : "outline"}
                      className="ml-auto text-xs"
                    >
                      {watermarkEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Toggle row — always clickable */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
                    <div className="space-y-1 pr-4">
                      <p className="text-sm font-medium">Apply Watermark on All Photos</p>
                      <p className="text-xs text-muted-foreground">
                        When enabled your studio logo appears as a watermark on every photo
                        in your galleries. Toggle off to remove it instantly.
                      </p>
                    </div>
                    <Switch
                      checked={watermarkEnabled}
                      onCheckedChange={handleWatermarkToggle}
                      disabled={togglingWatermark}
                    />
                  </div>

                  {/* Status line */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span
                      className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                        watermarkEnabled
                          ? "bg-green-500 animate-pulse"
                          : "bg-muted-foreground/40"
                      }`}
                    />
                    {togglingWatermark
                      ? "Updating…"
                      : watermarkEnabled
                      ? "Watermark is active — visible on all photos"
                      : "Watermark is off — photos shown without overlay"}
                  </div>

                  {/* Hint: enabled but no logo yet */}
                  {watermarkEnabled && !studio?.settings?.watermark && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                      <span className="shrink-0 mt-0.5">⚠</span>
                      <span>
                        Watermark is enabled, but no studio logo has been uploaded yet.
                        Upload a logo above — it will immediately appear as the watermark.
                      </span>
                    </div>
                  )}

                  {/* Live preview — shown only when enabled AND logo exists */}
                  {watermarkEnabled && studio?.settings?.watermark && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative overflow-hidden rounded-xl border border-border/50 bg-muted/20 h-48 flex items-center justify-center"
                    >
                      <span className="text-muted-foreground/30 text-sm select-none">
                        Photo preview area
                      </span>
                      {/* Watermark overlay — bottom-right, same position as gallery */}
                      <div className="absolute bottom-3 right-3 pointer-events-none">
                        <Image
                          src={studio.settings.watermark}
                          alt="Watermark preview"
                          width={64}
                          height={64}
                          className="w-16 h-16 object-contain opacity-60"
                        />
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ── Profile Tab ───────────────────────────────────────────────── */}
          <TabsContent value="profile">
            <Card className="border border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white text-xl font-bold">
                    {user?.name?.[0]?.toUpperCase() || "A"}
                  </div>
                  <div>
                    <p className="font-semibold">{user?.name}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    <Badge variant="rose" className="mt-1 text-xs capitalize">{user?.role}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm mb-2 block">Full Name</Label>
                    <Input defaultValue={user?.name} placeholder="Your name" />
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block">Email</Label>
                    <Input defaultValue={user?.email} type="email" readOnly className="bg-muted/50" />
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block">Phone</Label>
                    <Input placeholder="+91 98765 43210" />
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block">Role</Label>
                    <Input value={user?.role ?? ""} readOnly className="bg-muted/50 capitalize" />
                  </div>
                </div>
                <Button className="gap-2">
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Gallery Tab ───────────────────────────────────────────────── */}
          <TabsContent value="gallery">
            <Card className="border border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  Gallery Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {/* Watermark — wired to real API for admin; read-only hint for photographers */}
                <div className="flex items-center justify-between py-3 border-b border-border/30">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      Enable Watermark on Photos
                      <Badge
                        variant={watermarkEnabled ? "green" : "outline"}
                        className="text-xs"
                      >
                        {watermarkEnabled ? "On" : "Off"}
                      </Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Overlay studio logo on every photo in galleries
                      {!isAdmin && " — only the studio admin can change this"}
                    </p>
                  </div>
                  <Switch
                    checked={watermarkEnabled}
                    onCheckedChange={isAdmin ? handleWatermarkToggle : undefined}
                    disabled={togglingWatermark || !isAdmin}
                  />
                </div>

                {[
                  { label: "Allow photo downloads",   description: "Guests can download individual photos",  checked: true  },
                  { label: "Show download button",     description: "Display download button on gallery",     checked: true  },
                  { label: "Public events by default", description: "New events are publicly accessible",     checked: true  },
                  { label: "Enable batch downloads",   description: "Allow ZIP export of entire gallery",     checked: true  },
                  { label: "Enable face recognition",  description: "Allow AI face matching for guests",      checked: true  },
                  { label: "Guest comments",           description: "Allow guests to comment on photos",      checked: false },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center justify-between py-3 border-b border-border/30 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{s.label}</p>
                      <p className="text-xs text-muted-foreground">{s.description}</p>
                    </div>
                    <Switch defaultChecked={s.checked} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Notifications Tab ─────────────────────────────────────────── */}
          <TabsContent value="notifications">
            <Card className="border border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {[
                    { label: "New photo uploads",    description: "When photos are uploaded to your events" },
                    { label: "Face match activity",  description: "When guests use face recognition" },
                    { label: "Event views",          description: "When guests scan QR and visit gallery" },
                    { label: "Downloads",            description: "When guests download photos" },
                    { label: "Weekly report",        description: "Weekly analytics summary" },
                  ].map((n) => (
                    <div
                      key={n.label}
                      className="flex items-center justify-between py-3 border-b border-border/30 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{n.label}</p>
                        <p className="text-xs text-muted-foreground">{n.description}</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Security Tab ──────────────────────────────────────────────── */}
          <TabsContent value="security">
            <Card className="border border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Change Password</h4>
                  <div className="space-y-3">
                    <Input
                      type="password"
                      placeholder="Current password"
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                    />
                    <Input
                      type="password"
                      placeholder="New password (min. 8 characters)"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                    />
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePasswordChange}
                      disabled={savingPw}
                    >
                      {savingPw ? "Updating…" : "Update Password"}
                    </Button>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Active Sessions</h4>
                  <div className="p-3 bg-muted/50 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Current Session</p>
                      <p className="text-xs text-muted-foreground">Browser · 24 h token</p>
                    </div>
                    <Badge variant="green" className="text-xs">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
