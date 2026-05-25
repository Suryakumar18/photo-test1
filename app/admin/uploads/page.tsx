"use client";

import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Check,
  ChevronDown,
  Cloud,
  Image,
  Loader2,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBytes } from "@/lib/utils";
import toast from "react-hot-toast";
import type { UploadProgress } from "@/types";

const mockEvents = [
  { id: "1", title: "Priya & Arjun Wedding" },
  { id: "2", title: "Kavitha & Suresh Reception" },
  { id: "3", title: "Meera & Rohan Wedding" },
];

export default function UploadCenterPage() {
  const [selectedEvent, setSelectedEvent] = useState("");
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const uploadQueueRef = useRef<UploadProgress[]>([]);

  const processUpload = async (upload: UploadProgress, eventId: string) => {
    const formData = new FormData();
    formData.append("file", upload.file);
    formData.append("eventId", eventId);

    try {
      const token = document.cookie.match(/auth-token=([^;]+)/)?.[1] || "";
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();

      setUploads((prev) =>
        prev.map((u) =>
          u.file === upload.file
            ? { ...u, status: "complete", progress: 100, url: data.data?.cdnUrl }
            : u
        )
      );
    } catch {
      setUploads((prev) =>
        prev.map((u) =>
          u.file === upload.file ? { ...u, status: "error", error: "Upload failed" } : u
        )
      );
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!selectedEvent) {
        toast.error("Please select an event first");
        return;
      }

      const newUploads: UploadProgress[] = acceptedFiles.map((file) => ({
        file,
        progress: 0,
        status: "pending",
      }));

      setUploads((prev) => [...prev, ...newUploads]);
      setIsUploading(true);

      // Simulate progress and upload
      for (const upload of newUploads) {
        setUploads((prev) =>
          prev.map((u) =>
            u.file === upload.file ? { ...u, status: "uploading", progress: 10 } : u
          )
        );

        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploads((prev) =>
            prev.map((u) => {
              if (u.file === upload.file && u.status === "uploading" && u.progress < 85) {
                return { ...u, progress: u.progress + Math.random() * 15 };
              }
              return u;
            })
          );
        }, 300);

        await processUpload(upload, selectedEvent);
        clearInterval(progressInterval);
      }

      setIsUploading(false);
      const successCount = newUploads.length;
      toast.success(`${successCount} photo${successCount > 1 ? "s" : ""} uploaded!`);
    },
    [selectedEvent]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".webp", ".heic"],
      "video/*": [".mp4", ".mov", ".avi"],
    },
    multiple: true,
  });

  const clearCompleted = () => {
    setUploads((prev) => prev.filter((u) => u.status !== "complete"));
  };

  const stats = {
    total: uploads.length,
    complete: uploads.filter((u) => u.status === "complete").length,
    uploading: uploads.filter((u) => u.status === "uploading").length,
    error: uploads.filter((u) => u.status === "error").length,
    totalSize: uploads.reduce((acc, u) => acc + u.file.size, 0),
  };

  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Upload Center" subtitle="Upload photos and videos to your events" />

      <div className="p-6 space-y-6 max-w-5xl">
        {/* Event selector */}
        <Card className="border border-border/50">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Select Event</label>
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose event to upload photos..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mockEvents.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedEvent && (
                <Badge variant="green" className="shrink-0">
                  <Zap className="w-3 h-3 mr-1" />
                  Event Selected
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={`relative border-2 border-dashed rounded-3xl p-16 text-center cursor-pointer transition-all duration-300 ${
            isDragActive
              ? "border-primary bg-primary/5 scale-[1.02]"
              : selectedEvent
              ? "border-border hover:border-primary/50 hover:bg-muted/30"
              : "border-border/30 opacity-50 cursor-not-allowed"
          }`}
        >
          <input {...getInputProps()} disabled={!selectedEvent} />
          <motion.div
            animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <div
              className={`w-20 h-20 rounded-3xl flex items-center justify-center ${
                isDragActive ? "bg-primary text-white" : "bg-muted"
              } transition-colors duration-300`}
            >
              {isDragActive ? (
                <Cloud className="w-10 h-10" />
              ) : (
                <Upload className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">
                {isDragActive ? "Drop to upload!" : "Drag & drop photos"}
              </h3>
              <p className="text-muted-foreground">
                or <span className="text-primary font-medium">click to browse</span> · JPG, PNG,
                WebP, HEIC, MP4, MOV
              </p>
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>Unlimited files</span>
              <span>·</span>
              <span>Auto CDN sync</span>
              <span>·</span>
              <span>Face detection</span>
            </div>
          </motion.div>
        </div>

        {/* Upload progress */}
        <AnimatePresence>
          {uploads.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="border border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-sm">
                        Upload Queue ({stats.total} files)
                      </h3>
                      {stats.complete > 0 && (
                        <Badge variant="green" className="text-xs">
                          {stats.complete} done
                        </Badge>
                      )}
                      {stats.uploading > 0 && (
                        <Badge variant="blue" className="text-xs">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          {stats.uploading} uploading
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {stats.complete > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearCompleted}>
                          Clear done
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
                    {uploads.map((upload, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                      >
                        {/* Thumbnail */}
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted">
                          {upload.file.type.startsWith("image/") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={URL.createObjectURL(upload.file)}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Image className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{upload.file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatBytes(upload.file.size)}
                          </p>
                          {upload.status === "uploading" && (
                            <Progress
                              value={upload.progress}
                              className="h-1 mt-1.5"
                            />
                          )}
                        </div>

                        {/* Status */}
                        <div className="shrink-0">
                          {upload.status === "complete" && (
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                          {upload.status === "uploading" && (
                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                          )}
                          {upload.status === "pending" && (
                            <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                          )}
                          {upload.status === "error" && (
                            <div className="w-6 h-6 bg-destructive rounded-full flex items-center justify-center">
                              <X className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Overall progress */}
                  {isUploading && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-muted-foreground">Overall Progress</span>
                        <span className="font-medium">
                          {stats.complete}/{stats.total}
                        </span>
                      </div>
                      <Progress
                        value={(stats.complete / stats.total) * 100}
                        className="h-2"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
