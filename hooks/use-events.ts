import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Event, PaginationParams } from "@/types";

async function fetchEvents(params: PaginationParams = {}) {
  const token = document.cookie.match(/auth-token=([^;]+)/)?.[1] || "";
  const qs = new URLSearchParams(
    Object.entries(params).reduce(
      (acc, [k, v]) => ({ ...acc, [k]: String(v) }),
      {} as Record<string, string>
    )
  ).toString();

  const res = await fetch(`/api/events?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Failed to fetch events");
  const data = await res.json();
  return data.data;
}

async function createEvent(formData: FormData) {
  const token = document.cookie.match(/auth-token=([^;]+)/)?.[1] || "";
  const res = await fetch("/api/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to create event");
  }

  return res.json();
}

export function useEvents(params: PaginationParams = {}) {
  return useQuery({
    queryKey: ["events", params],
    queryFn: () => fetchEvents(params),
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
