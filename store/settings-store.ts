import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Language = "hu" | "en";

type SettingsStore = {
  language: Language;
  setLanguage: (language: Language) => void;

  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
};

export const SETTINGS_STORAGE_KEY = "wire-app-settings";

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      language: "hu",
      setLanguage: (language) => set({ language }),

      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ language: state.language }),
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
