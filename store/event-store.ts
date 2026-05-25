import { create } from "zustand";
import type { Event, GalleryFilter } from "@/types";

interface EventState {
  currentEvent: Event | null;
  galleryFilter: GalleryFilter;
  selectedPhotos: string[];
  setCurrentEvent: (event: Event | null) => void;
  setGalleryFilter: (filter: Partial<GalleryFilter>) => void;
  resetGalleryFilter: () => void;
  togglePhotoSelection: (photoId: string) => void;
  clearSelection: () => void;
  selectAll: (photoIds: string[]) => void;
}

const defaultFilter: GalleryFilter = {
  search: "",
  tags: [],
  sortBy: "newest",
};

export const useEventStore = create<EventState>((set) => ({
  currentEvent: null,
  galleryFilter: defaultFilter,
  selectedPhotos: [],
  setCurrentEvent: (event) => set({ currentEvent: event }),
  setGalleryFilter: (filter) =>
    set((state) => ({
      galleryFilter: { ...state.galleryFilter, ...filter },
    })),
  resetGalleryFilter: () => set({ galleryFilter: defaultFilter }),
  togglePhotoSelection: (photoId) =>
    set((state) => ({
      selectedPhotos: state.selectedPhotos.includes(photoId)
        ? state.selectedPhotos.filter((id) => id !== photoId)
        : [...state.selectedPhotos, photoId],
    })),
  clearSelection: () => set({ selectedPhotos: [] }),
  selectAll: (photoIds) => set({ selectedPhotos: photoIds }),
}));
