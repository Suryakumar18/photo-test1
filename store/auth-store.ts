"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "photographer" | "client";
  avatar?: string;
  studioId?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (val: boolean) => void;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setHasHydrated: (val) => set({ _hasHydrated: val }),

      login: (user, token) => {
        document.cookie = `auth-token=${token}; path=/; max-age=${24 * 60 * 60}; SameSite=Strict`;
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: "memorable-pictures-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Re-sync cookie so API routes can still authenticate after page reload
        if (state?.token && state?.isAuthenticated) {
          document.cookie = `auth-token=${state.token}; path=/; max-age=${24 * 60 * 60}; SameSite=Strict`;
        }
        state?.setHasHydrated(true);
      },
    }
  )
);
