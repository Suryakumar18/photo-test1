"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SuperAdminState {
  isAuthenticated: boolean;
  token: string | null;
  email: string | null;
  /** True once zustand has finished reading from localStorage */
  _hasHydrated: boolean;
  setHasHydrated: (val: boolean) => void;
  login: (token: string, email: string) => void;
  logout: () => void;
}

export const useSuperAdminStore = create<SuperAdminState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      token: null,
      email: null,
      _hasHydrated: false,

      setHasHydrated: (val) => set({ _hasHydrated: val }),

      login: (token, email) => {
        // Set the cookie so API routes can read it server-side
        document.cookie = `super-admin-token=${token}; path=/; max-age=${
          24 * 60 * 60
        }; SameSite=Strict`;
        set({ isAuthenticated: true, token, email });
      },

      logout: () => {
        document.cookie =
          "super-admin-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        set({ isAuthenticated: false, token: null, email: null });
      },
    }),
    {
      name: "super-admin-auth",
      // Only persist auth-relevant fields (not _hasHydrated — that's runtime-only)
      partialize: (s) => ({
        isAuthenticated: s.isAuthenticated,
        token: s.token,
        email: s.email,
      }),
      onRehydrateStorage: () => (state) => {
        // After localStorage is read, re-sync the cookie so server-side API
        // routes can still authenticate (cookie may have been cleared on reload).
        if (state?.token && state?.isAuthenticated) {
          document.cookie = `super-admin-token=${state.token}; path=/; max-age=${
            24 * 60 * 60
          }; SameSite=Strict`;
        }
        // Signal that hydration is complete so the layout stops showing the spinner
        state?.setHasHydrated(true);
      },
    }
  )
);
