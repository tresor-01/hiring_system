import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Company } from '../types';

interface AuthState {
  user: User | null;
  company: Company | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, company: Company | null, token: string) => void;
  updateCompany: (company: Company) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      company: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, company, token) =>
        set({ user, company, token, isAuthenticated: true }),
      updateCompany: (company) => set({ company }),
      logout: () => set({ user: null, company: null, token: null, isAuthenticated: false })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        company: state.company,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
