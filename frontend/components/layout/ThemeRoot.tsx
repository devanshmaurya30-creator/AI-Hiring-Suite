'use client';

import React, { useEffect } from 'react';
import { useThemeStore } from '@/lib/store/themeStore';
import CommandPalette from '@/components/ui/CommandPalette';

export default function ThemeRoot({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    // Sync theme from localStorage on load
    const savedTheme = localStorage.getItem('theme') as any;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      setTheme('glass');
    }
  }, [setTheme]);

  return (
    <div className={`theme-${theme} min-h-screen transition-colors duration-300`}>
      <CommandPalette />
      {children}
    </div>
  );
}
