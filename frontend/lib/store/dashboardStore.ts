import { create } from 'zustand';
import type { DashboardStats, DashboardAnalytics } from '@/types';
import { dashboard } from '@/lib/api/endpoints';

interface DashboardState {
  stats: DashboardStats | null;
  analytics: DashboardAnalytics | null;
  isLoading: boolean;
  fetchStats: () => Promise<void>;
  fetchAnalytics: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: null,
  analytics: null,
  isLoading: false,

  fetchStats: async () => {
    set({ isLoading: true });
    try {
      const stats = await dashboard.getStats();
      set({ stats, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      set({ isLoading: false });
    }
  },

  fetchAnalytics: async () => {
    set({ isLoading: true });
    try {
      const analytics = await dashboard.getAnalytics();
      set({ analytics, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch dashboard analytics:', error);
      set({ isLoading: false });
    }
  },
}));
