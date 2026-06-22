'use client';

import React from 'react';
import { Bell, Search, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import Logo from '@/components/ui/Logo';

interface HeaderProps {
  title?: string;
}

export default function Header({ title = 'Dashboard' }: HeaderProps) {
  const { user } = useAuthStore();

  return (
    <header className="sticky top-0 right-0 left-0 lg:left-[280px] z-30 h-20 bg-[#0a0a1a]/40 backdrop-blur-md border-b border-white/[0.08] px-6 lg:px-8 flex items-center justify-between">
      {/* Logo (Mobile) & Title */}
      <div className="flex items-center gap-4">
        <div className="lg:hidden">
          <Logo variant="navbar" />
        </div>
        <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-300 capitalize">
          {title}
        </h1>
      </div>

      {/* Center Search bar */}
      <div 
        onClick={() => {
          const event = new KeyboardEvent('keydown', {
            key: 'k',
            ctrlKey: true,
            bubbles: true,
            cancelable: true
          });
          window.dispatchEvent(event);
        }}
        className="hidden md:flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-white/5 bg-slate-950/40 hover:bg-slate-950/60 transition-all duration-300 w-80 cursor-pointer shadow-inner group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Search className="w-4 h-4 text-slate-500 group-hover:text-slate-400 transition-colors shrink-0" />
          <span className="text-slate-500 group-hover:text-slate-400 transition-colors text-xs font-semibold select-none">Search terminal...</span>
        </div>
        <kbd className="text-[9px] font-bold text-slate-500 border border-white/5 bg-white/[0.02] px-1.5 py-0.5 rounded shadow-sm group-hover:border-white/10 transition-colors">
          ⌘K
        </kbd>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04] text-slate-400 hover:text-slate-200 transition-all duration-300">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
        </button>

        {/* User profile bubble */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-extrabold text-xs flex items-center justify-center border border-white/10 shadow-md">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
          </div>
          <span className="hidden sm:inline text-xs font-semibold text-slate-300 max-w-[100px] truncate">
            {user?.full_name || 'Guest'}
          </span>
        </div>
      </div>
    </header>
  );
}
