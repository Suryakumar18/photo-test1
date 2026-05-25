"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { useQueryClient } from "@tanstack/react-query";
import {
  X, Calendar, Check, Copy, Download, Image as ImageIcon,
  Loader2, MapPin, QrCode, Upload, Users, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface EventForm {
  title: string;
  brideName: string;
  groomName: string;
  eventDate: string;
  location: string;
  description: string;
}

const emptyForm: EventForm = {
  title: "", brideName: "", groomName: "",
  eventDate: "", location: "", description: "",
};

export function CreateEventModal({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [created, setCreated] = useState<{ slug: string; shareUrl: string; qrCode: string } | null>(null);

  const onDrop = useCallback((files: File[]) => {
    const file = files[0];
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

  const reset = () => {
    setForm(emptyForm);
    setCoverFile(null);
    setCoverPreview(null);
    setCreated(null);
    setIsLoading(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleChange = (field: keyof EventForm, value: string) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (!prev.title && (field === "brideName" || field === "groomName")) {
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

      setCreated({
        slug: data.data.slug,
        shareUrl: data.data.shareUrl,
        qrCode: data.data.qrCode,
      });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event created successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setIsLoading(false);
    }
  };

  const copyLink = () => {
    if (!created) return;
    navigator.clipboard.writeText(created.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied!");
  };

  const downloadQR = () => {
    if (!created?.qrCode) return;
    const link = document.createElement("a");
    link.href = created.qrCode;
    link.download = `${form.title || "event"}-qr.png`;
    link.click();
    toast.success("QR downloaded!");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            className="bg-background w-full sm:max-w-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold">{created ? "Event Created!" : "Create New Event"}</h2>
                  <p className="text-xs text-muted-foreground">
                    {created ? "Share the QR code with guests" : "Set up a new wedding event"}
                  </p>
                </div>
              </div>
              <button onClick={close} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Success state ──────────────────────────────────────────── */}
            {created ? (
              <div className="p-6 overflow-y-auto text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <Check className="w-7 h-7 text-white" />
                </motion.div>
                <h3 className="text-lg font-bold mb-1">{form.title}</h3>
                <p className="text-sm text-muted-foreground mb-5">Your event is live and ready</p>

                <div className="bg-white p-4 rounded-2xl inline-block mb-5 shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={created.qrCode} alt="QR Code" className="w-44 h-44" />
                </div>

                <div className="flex items-center gap-2 bg-muted rounded-xl p-3 text-sm mb-5">
                  <span className="flex-1 truncate text-left text-xs">{created.shareUrl}</span>
                  <button onClick={copyLink} className="shrink-0 p-1 hover:text-primary transition-colors">
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={downloadQR} className="flex-1 gap-2">
                    <Download className="w-4 h-4" /> Download QR
                  </Button>
                  <Button onClick={close} className="flex-1 gap-2">
                    <Check className="w-4 h-4" /> Done
                  </Button>
                </div>
              </div>
            ) : (
              /* ── Form state ──────────────────────────────────────────── */
              <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-5">
                {/* Couple */}
                <div>
                  <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> Couple Information
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs mb-1.5 block text-muted-foreground">Bride Name *</Label>
                      <Input
                        placeholder="Bride's name"
                        value={form.brideName}
                        onChange={(e) => handleChange("brideName", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block text-muted-foreground">Groom Name *</Label>
                      <Input
                        placeholder="Groom's name"
                        value={form.groomName}
                        onChange={(e) => handleChange("groomName", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <Label className="text-xs mb-1.5 block text-muted-foreground">Event Title *</Label>
                    <Input
                      placeholder="e.g., Priya & Arjun Wedding"
                      value={form.title}
                      onChange={(e) => handleChange("title", e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Details */}
                <div>
                  <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" /> Event Details
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs mb-1.5 block text-muted-foreground">Event Date *</Label>
                      <Input
                        type="date"
                        value={form.eventDate}
                        onChange={(e) => handleChange("eventDate", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block text-muted-foreground">Location *</Label>
                      <Input
                        placeholder="Venue & city"
                        value={form.location}
                        onChange={(e) => handleChange("location", e.target.value)}
                        icon={<MapPin className="w-4 h-4" />}
                        required
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <Label className="text-xs mb-1.5 block text-muted-foreground">Description</Label>
                    <textarea
                      placeholder="Optional description…"
                      value={form.description}
                      onChange={(e) => handleChange("description", e.target.value)}
                      className="flex min-h-20 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    />
                  </div>
                </div>

                {/* Cover */}
                <div>
                  <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" /> Cover Image
                  </Label>
                  <div
                    {...getRootProps()}
                    className={`relative border-2 border-dashed rounded-2xl overflow-hidden cursor-pointer transition-all ${
                      isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <input {...getInputProps()} />
                    {coverPreview ? (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={coverPreview} alt="Cover" className="w-full h-36 object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <p className="text-white text-sm">Click to change</p>
                        </div>
                      </div>
                    ) : (
                      <div className="h-32 flex flex-col items-center justify-center gap-2 p-4 text-center">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                          <Upload className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">Drop cover image</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl p-3">
                  <QrCode className="w-4 h-4 text-primary shrink-0" />
                  A unique QR code is auto-generated when you create the event.
                </div>

                <Button type="submit" className="w-full gap-2" size="lg" disabled={isLoading}>
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Creating Event…</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Create Event</>
                  )}
                </Button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
