'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Terminal, 
  Moon, 
  Sun, 
  Laptop, 
  Eye, 
  Sparkles, 
  Navigation, 
  Compass, 
  Briefcase, 
  Trophy,
  FileText,
  MessageSquare,
  LogOut
} from 'lucide-react';
import { useThemeStore, ThemeMode } from '@/lib/store/themeStore';
import { useAuthStore } from '@/lib/store/authStore';

interface CommandItem {
  id: string;
  title: string;
  category: string;
  icon: React.ElementType;
  action: () => void;
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const { setTheme } = useThemeStore();
  const { logout, user } = useAuthStore();
  const listRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Go to HR Recruiter Dashboard',
      category: 'Navigation',
      icon: Compass,
      action: () => { router.push('/dashboard'); setIsOpen(false); }
    },
    {
      id: 'nav-upload',
      title: 'Go to Resume Upload Center',
      category: 'Navigation',
      icon: FileText,
      action: () => { router.push('/resume-upload'); setIsOpen(false); }
    },
    {
      id: 'nav-matching',
      title: 'Go to AI Job Matching',
      category: 'Navigation',
      icon: Briefcase,
      action: () => { router.push('/job-matching'); setIsOpen(false); }
    },
    {
      id: 'nav-ranking',
      title: 'Go to Candidate Leaderboard Rankings',
      category: 'Navigation',
      icon: Trophy,
      action: () => { router.push('/candidate-ranking'); setIsOpen(false); }
    },
    {
      id: 'nav-interview',
      title: 'Go to Technical AI Interview Bot',
      category: 'Navigation',
      icon: MessageSquare,
      action: () => { router.push('/interview'); setIsOpen(false); }
    },
    // Theme selection
    {
      id: 'theme-dark',
      title: 'Switch Theme to Dark Space',
      category: 'Appearance',
      icon: Moon,
      action: () => { setTheme('dark'); setIsOpen(false); }
    },
    {
      id: 'theme-light',
      title: 'Switch Theme to Apple Light',
      category: 'Appearance',
      icon: Sun,
      action: () => { setTheme('light'); setIsOpen(false); }
    },
    {
      id: 'theme-midnight',
      title: 'Switch Theme to Midnight Cyber (Neon)',
      category: 'Appearance',
      icon: Terminal,
      action: () => { setTheme('midnight'); setIsOpen(false); }
    },
    {
      id: 'theme-glass',
      title: 'Switch Theme to Frosted Glass Vision',
      category: 'Appearance',
      icon: Laptop,
      action: () => { setTheme('glass'); setIsOpen(false); }
    },
    // Actions
    {
      id: 'action-logout',
      title: 'Log out of Current Session',
      category: 'System',
      icon: LogOut,
      action: () => { logout(); setIsOpen(false); }
    }
  ];

  // Filter commands by user role and search input
  const filteredCommands = commands.filter((cmd) => {
    // Role filter
    if (user?.role === 'candidate' && (cmd.id === 'nav-dashboard' || cmd.id === 'nav-ranking')) {
      return false;
    }
    if (user?.role === 'hr' && cmd.id === 'nav-upload') {
      return false;
    }

    if (!search) return true;
    return (
      cmd.title.toLowerCase().includes(search.toLowerCase()) ||
      cmd.category.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Toggle command palette on Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Keyboard navigation inside list
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  // Keep selected index in bounds when list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Scroll active item into view
  useEffect(() => {
    const activeEl = listRef.current?.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-[#020208]/80 backdrop-blur-md"
          />

          {/* Dialog Body */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: 'spring', damping: 20, stiffness: 260 }}
            className="relative w-full max-w-xl bg-[#090912]/80 border border-white/[0.08] backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden text-slate-200"
          >
            {/* Input Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06]">
              <Search className="w-5 h-5 text-slate-500 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type a command or navigate..."
                className="w-full bg-transparent text-sm text-slate-200 outline-none placeholder-slate-600 font-medium"
                autoFocus
              />
              <span className="text-[10px] bg-white/[0.03] border border-white/[0.08] text-slate-500 font-bold px-2 py-0.5 rounded-lg shrink-0">
                ESC
              </span>
            </div>

            {/* Suggestions / List */}
            <div ref={listRef} className="max-h-80 overflow-y-auto p-2 space-y-1">
              {filteredCommands.length > 0 ? (
                // Group by categories
                Object.entries(
                  filteredCommands.reduce((acc, cmd) => {
                    if (!acc[cmd.category]) acc[cmd.category] = [];
                    acc[cmd.category].push(cmd);
                    return acc;
                  }, {} as Record<string, CommandItem[]>)
                ).map(([category, items]) => (
                  <div key={category} className="space-y-1">
                    <span className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-widest px-3 py-1.5 mt-1">
                      {category}
                    </span>
                    {items.map((cmd) => {
                      const Icon = cmd.icon;
                      // Calculate index in filtered list
                      const globalIdx = filteredCommands.findIndex((c) => c.id === cmd.id);
                      const isSelected = selectedIndex === globalIdx;

                      return (
                        <div
                          key={cmd.id}
                          onClick={cmd.action}
                          data-active={isSelected}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs font-semibold transition-all duration-200 border border-transparent ${
                            isSelected
                              ? 'bg-gradient-to-r from-indigo-500/15 via-indigo-500/5 to-transparent border-white/[0.08] text-slate-100'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.01]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                            <span className="truncate">{cmd.title}</span>
                          </div>
                          {isSelected && (
                            <span className="text-[9px] uppercase font-bold text-slate-500 border border-white/5 bg-white/[0.02] px-1.5 py-0.5 rounded">
                              Enter
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs font-semibold">
                  No matching commands found.
                </div>
              )}
            </div>

            {/* Footer hints */}
            <div className="px-4 py-2 bg-white/[0.01] border-t border-white/[0.04] flex items-center justify-between text-[10px] text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                Use <kbd className="border border-white/5 bg-white/[0.02] px-1 rounded">↑</kbd>{' '}
                <kbd className="border border-white/5 bg-white/[0.02] px-1 rounded">↓</kbd> to select
              </span>
              <span>AI Recruit Terminal 2.0</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
