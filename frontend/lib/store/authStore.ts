import { create } from 'zustand';
import type { User, Candidate } from '@/types';
import { auth } from '@/lib/api/endpoints';

interface AuthState {
  user: User | null;
  token: string | null;
  candidate: Candidate | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    role: string;
  }) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null,
  candidate: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await auth.login(email, password);
      localStorage.setItem('auth_token', response.token);
      
      const profile: any = await auth.getMe();
      
      set({
        user: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role
        },
        token: response.token,
        candidate: profile.candidate || null,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const response = await auth.register(data);
      localStorage.setItem('auth_token', response.token);
      
      const profile: any = await auth.getMe();
      
      set({
        user: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role
        },
        token: response.token,
        candidate: profile.candidate || null,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    set({
      user: null,
      token: null,
      candidate: null,
      isAuthenticated: false,
      isLoading: false,
    });
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  checkAuth: async () => {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const profile: any = await auth.getMe();
      set({
        user: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role
        },
        token,
        candidate: profile.candidate || null,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      localStorage.removeItem('auth_token');
      set({
        user: null,
        token: null,
        candidate: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  setUser: (user: User) => set({ user }),
}));
