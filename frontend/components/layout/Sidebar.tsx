'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FileUp,
  Briefcase,
  Trophy,
  MessageSquare,
  BarChart3,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  Calendar,
  Mail,
  FileText,
  Activity,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';
import Logo from '@/components/ui/Logo';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['hr'],
    },
    {
      name: 'Pipeline Board',
      href: '/dashboard/pipeline',
      icon: LayoutDashboard,
      roles: ['hr'],
    },
    {
      name: 'Resume Upload',
      href: '/resume-upload',
      icon: FileUp,
      roles: ['candidate'],
    },
    {
      name: 'Job Matching',
      href: '/job-matching',
      icon: Briefcase,
      roles: ['candidate', 'hr'],
    },
    {
      name: 'Career AI Hub',
      href: '/career-hub',
      icon: Briefcase,
      roles: ['candidate'],
    },
    {
      name: 'Candidate Ranking',
      href: '/candidate-ranking',
      icon: Trophy,
      roles: ['hr'],
    },
    {
      name: 'Interview Bot',
      href: '/interview',
      icon: MessageSquare,
      roles: ['candidate', 'hr'],
    },
    {
      name: 'AI Chatbot',
      href: '/chatbot',
      icon: MessageSquare,
      roles: ['candidate'],
    },
    {
      name: 'Skill Gap',
      href: '/skill-gap',
      icon: Activity,
      roles: ['candidate'],
    },
    {
      name: 'Schedule',
      href: '/schedule',
      icon: Calendar,
      roles: ['hr', 'candidate'],
    },
    {
      name: 'Email Pipeline',
      href: '/email-pipeline',
      icon: Mail,
      roles: ['hr'],
    },
    {
      name: 'Reports',
      href: '/interview-reports',
      icon: FileText,
      roles: ['hr'],
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      roles: ['hr'],
    },
  ];

  const userRole = user?.role || 'candidate';
  const filteredMenuItems = menuItems.filter((item) => item.roles.includes(userRole));

  const toggleSidebar = () => setIsOpen(!isOpen);

  const renderSidebarContent = (isMobile = false) => (
    <div className={cn(
      "flex flex-col h-full p-6 text-slate-300 relative overflow-hidden",
      isMobile 
        ? "bg-[#050515]/75 backdrop-blur-2xl border-r border-white/[0.08]" 
        : "bg-gradient-to-b from-white/[0.03] to-white/[0.01] backdrop-blur-3xl"
    )}>
      {/* Light highlights inside card */}
      <div className="absolute -top-12 -left-12 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Logo */}
      <Logo variant="sidebar" className="mb-8 relative z-10" />

      {/* Navigation Links */}
      <nav className="flex-1 space-y-2 relative z-10">
        {filteredMenuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.name} href={item.href} onClick={() => setIsOpen(false)}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, ease: "easeOut" }}
                className={cn(
                  'relative flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 group cursor-pointer border border-transparent',
                  isActive
                    ? 'text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-bg"
                    className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-transparent border border-white/[0.08] rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                
                {/* Accent line on active */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-line"
                    className="absolute left-0 top-3 bottom-3 w-[3px] bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}

                <Icon className={cn(
                  'w-5 h-5 transition-all duration-300 relative z-10', 
                  isActive 
                    ? 'text-cyan-400 scale-105 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]' 
                    : 'text-slate-500 group-hover:text-slate-400 group-hover:scale-105'
                )} />
                <span className="relative z-10 tracking-wide text-xs uppercase font-medium">{item.name}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User Info / Profile & Logout */}
      <div className="border-t border-white/[0.08] pt-6 flex flex-col gap-4 relative z-10">
        <div className="flex items-center gap-3 p-1 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-300 flex items-center justify-center font-bold text-sm shadow-md">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-slate-200 truncate">{user?.full_name || 'Guest User'}</span>
            <span className="text-[9px] uppercase font-extrabold text-slate-500 tracking-widest">{user?.role === 'hr' ? 'HR Recruiter' : 'Candidate'}</span>
          </div>
        </div>

        <button
          onClick={logout}
          className="group relative flex items-center justify-center gap-2.5 w-full py-3 rounded-xl border border-white/5 hover:border-cyan-500/20 text-xs font-bold bg-white/[0.01] hover:bg-cyan-500/5 text-slate-400 hover:text-cyan-300 transition-all duration-300 shadow-sm"
        >
          <LogOut className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={toggleSidebar}
          className="p-3 rounded-xl bg-[#050515]/75 border border-white/10 backdrop-blur-md text-slate-300 focus:outline-none hover:bg-[#07071a] transition-colors"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop Sidebar (Fixed & Floating) */}
      <aside className="hidden lg:block fixed top-4 bottom-4 left-4 w-[250px] z-40">
        <div className="h-full rounded-2xl border border-white/[0.08] overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
          {renderSidebarContent(false)}
        </div>
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={toggleSidebar}
              className="lg:hidden fixed inset-0 bg-[#020208]/90 z-40 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="lg:hidden fixed top-0 bottom-0 left-0 w-[280px] z-50"
            >
              {renderSidebarContent(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
