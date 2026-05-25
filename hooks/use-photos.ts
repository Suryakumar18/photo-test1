import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { GalleryFilter } from "@/types";

async function fetchPhotos(eventId: string, filter: GalleryFilter = {}, page = 1) {
  const params = new URLSearchParams({
    eventId,
    page: String(page),
    limit: "50",
    ...(filter.search ? { search: filter.search } : {}),
    ...(filter.sortBy ? { sortBy: filter.sortBy } : {}),
  });

  const res = await fetch(`/api/photos?${params}`);
  if (!res.ok) throw new Error("Failed to fetch photos");
  const data = await res.json();
  return data.data;
}

async function toggleFavorite(photoId: string, eventId: string, sessionId: string) {
  const res = await fetch("/api/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photoId, eventId, sessionId }),
  });
  if (!res.ok) throw new Error("Failed to toggle favorite");
  return res.json();
}

export function usePhotos(eventId: string, filter: GalleryFilter = {}, page = 1) {
  return useQuery({
    queryKey: ["photos", eventId, filter, page],
    queryFn: () => fetchPhotos(eventId, filter, page),
    enabled: !!eventId,
  });
}

export function useFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      photoId,
      eventId,
      sessionId,
    }: {
      photoId: string;
      eventId: string;
      sessionId: string;
    }) => toggleFavorite(photoId, eventId, sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photos"] });
    },
  });
}
