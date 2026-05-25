import { useState, useCallback } from "react";
import type { UploadProgress } from "@/types";

export function useUpload(eventId: string) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("eventId", eventId);

      const token = document.cookie.match(/auth-token=([^;]+)/)?.[1] || "";

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        return data.data?.cdnUrl || null;
      } catch {
        return null;
      }
    },
    [eventId]
  );

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const newUploads: UploadProgress[] = files.map((file) => ({
        file,
        progress: 0,
        status: "pending",
      }));

      setUploads((prev) => [...prev, ...newUploads]);
      setIsUploading(true);

      for (const upload of newUploads) {
        setUploads((prev) =>
          prev.map((u) =>
            u.file === upload.file ? { ...u, status: "uploading", progress: 0 } : u
          )
        );

        const interval = setInterval(() => {
          setUploads((prev) =>
            prev.map((u) => {
              if (u.file === upload.file && u.status === "uploading" && u.progress < 90) {
                return { ...u, progress: Math.min(u.progress + 15, 90) };
              }
              return u;
            })
          );
        }, 300);

        const cdnUrl = await uploadFile(upload.file);
        clearInterval(interval);

        setUploads((prev) =>
          prev.map((u) =>
            u.file === upload.file
              ? { ...u, status: cdnUrl ? "complete" : "error", progress: 100, url: cdnUrl || undefined }
              : u
          )
        );
      }

      setIsUploading(false);
    },
    [uploadFile]
  );

  const clearCompleted = useCallback(() => {
    setUploads((prev) => prev.filter((u) => u.status !== "complete"));
  }, []);

  return { uploads, isUploading, uploadFiles, clearCompleted };
}
