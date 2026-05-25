"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import {
  Calendar,
  Camera,
  Check,
  Copy,
  Download,
  Image,
  Loader2,
  MapPin,
  QrCode,
  Upload,
  Users,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import toast from "react-hot-toast";

interface EventForm {
  title: string;
  brideName: string;
  groomName: string;
  eventDate: string;
  location: string;
  description: string;
}

export default function CreateEventPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [createdEvent, setCreatedEvent] = useState<{
    slug: string;
    shareUrl: string;
    qrCode: string;
  } | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState<EventForm>({
    title: "",
    brideName: "",
    groomName: "",
    eventDate: "",
    location: "",
    description: "",
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  const handleChange = (field: keyof EventForm, value: string) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (!form.title && (field === "brideName" || field === "groomName")) {
        if (updated.brideName && updated.groomName) {
          updated.title = `${updated.brideName} & ${updated.groomName} Wedding`;
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (coverFile) formData.append("cover", coverFile);

      const token = document.cookie.match(/auth-token=([^;]+)/)?.[1] || "";
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to create event");

      setCreatedEvent({
        slug: data.data.slug,
        shareUrl: data.data.shareUrl,
        qrCode: data.data.qrCode,
      });
      toast.success("Event created successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setIsLoading(false);
    }
  };

  const copyShareUrl = () => {
    if (createdEvent) {
      navigator.clipboard.writeText(createdEvent.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link copied!");
    }
  };

  const downloadQR = () => {
    if (!createdEvent?.qrCode) return;
    const link = document.createElement("a");
    link.href = createdEvent.qrCode;
    link.download = `${form.title || "event"}-qr-code.png`;
    link.click();
  };

  if (createdEvent) {
    return (
      <div className="flex flex-col min-h-full">
        <Topbar title="Event Created!" />
        <div className="p-6 max-w-2xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border border-green-500/30 bg-green-500/5">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Event Created!</h2>
                <p className="text-muted-foreground mb-8">{form.title}</p>

                {/* QR Code */}
                <div className="bg-white p-6 rounded-2xl inline-block mb-6 shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={createdEvent.qrCode} alt="QR Code" className="w-48 h-48" />
                </div>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-2 bg-muted rounded-xl p-3 text-sm">
                    <span className="flex-1 truncate text-left">{createdEvent.shareUrl}</span>
                    <Button variant="ghost" size="icon-sm" onClick={copyShareUrl}>
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={downloadQR} className="gap-2">
                    <Download className="w-4 h-4" />
                    Download QR
                  </Button>
                  <Button onClick={() => router.push("/admin/events")} className="gap-2">
                    <Camera className="w-4 h-4" />
                    View All Events
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Create Event" subtitle="Set up a new wedding event" />

      <div className="p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl">
            {/* Main form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Couple Info */}
              <Card className="border border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Couple Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm mb-2 block">Bride Name *</Label>
                      <Input
                        placeholder="Bride's name"
                        value={form.brideName}
                        onChange={(e) => handleChange("brideName", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-sm mb-2 block">Groom Name *</Label>
                      <Input
                        placeholder="Groom's name"
                        value={form.groomName}
                        onChange={(e) => handleChange("groomName", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block">Event Title *</Label>
                    <Input
                      placeholder="e.g., Priya & Arjun Wedding"
                      value={form.title}
                      onChange={(e) => handleChange("title", e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Event Details */}
              <Card className="border border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Event Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm mb-2 block">Event Date *</Label>
                      <Input
                        type="date"
                        value={form.eventDate}
                        onChange={(e) => handleChange("eventDate", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-sm mb-2 block">Location *</Label>
                      <Input
                        placeholder="Venue name & city"
                        value={form.location}
                        onChange={(e) => handleChange("location", e.target.value)}
                        icon={<MapPin className="w-4 h-4" />}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block">Description</Label>
                    <textarea
                      placeholder="Optional description about the event..."
                      value={form.description}
                      onChange={(e) => handleChange("description", e.target.value)}
                      className="flex min-h-24 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cover Image */}
            <div className="space-y-6">
              <Card className="border border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Image className="w-4 h-4 text-primary" />
                    Cover Image
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    {...getRootProps()}
                    className={`relative border-2 border-dashed rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 ${
                      isDragActive
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <input {...getInputProps()} />
                    {coverPreview ? (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={coverPreview}
                          alt="Cover"
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <p className="text-white text-sm">Click to change</p>
                        </div>
                      </div>
                    ) : (
                      <div className="h-48 flex flex-col items-center justify-center gap-3 p-6 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                          <Upload className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Drop cover image</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PNG, JPG up to 10MB
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* QR Preview */}
              <Card className="border border-border/50 bg-muted/30">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <QrCode className="w-6 h-6 text-primary" />
                  </div>
                  <p className="font-semibold text-sm mb-1">QR Code Auto-Generated</p>
                  <p className="text-xs text-muted-foreground">
                    A unique QR code will be generated after creating the event.
                  </p>
                </CardContent>
              </Card>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Event...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Create Event
                  </div>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
