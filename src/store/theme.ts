'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light';
// Two dark palettes: neutral black (shadcn style) or the original navy blue.
export type DarkStyle = 'black' | 'navy';

interface ThemeState {
  mode: ThemeMode;
  darkStyle: DarkStyle;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
  setDarkStyle: (darkStyle: DarkStyle) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'light',
      darkStyle: 'black',
      toggle: () => set((state) => ({ mode: state.mode === 'dark' ? 'light' : 'dark' })),
      setMode: (mode) => set({ mode }),
      setDarkStyle: (darkStyle) => set({ darkStyle }),
    }),
    { name: 'theme-preference' }
  )
);
