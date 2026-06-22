'use client';

import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light' | 'midnight' | 'glass';

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'glass',
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      root.classList.remove('theme-dark', 'theme-light', 'theme-midnight', 'theme-glass');
      root.classList.add(`theme-${theme}`);
      root.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    }
    set({ theme });
  },
}));
