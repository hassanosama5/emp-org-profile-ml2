// lib/stores/auth.store.ts
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api/auth/auth';
import {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  SystemRole,
} from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (credentials: LoginRequest) => Promise<AuthResponse>;
  register: (data: RegisterRequest) => Promise<AuthResponse>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  checkAuth: () => Promise<void>;
  hasRole: (role: SystemRole | string) => boolean;
  hasPermission: (permission: string) => boolean;
  getUserType: () => 'employee' | 'candidate' | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,
      isAuthenticated: false,

      login: async (credentials: LoginRequest) => {
        try {
          const result = await authApi.login(credentials);
          set({
            user: result.user,
            token: result.access_token,
            isAuthenticated: true,
          });
          return result;
        } catch (error) {
          set({ user: null, token: null, isAuthenticated: false });
          throw error;
        }
      },

      register: async (data: RegisterRequest) => {
        try {
          const result = await authApi.register(data);
          if (result.access_token && result.user) {
            set({
              user: result.user,
              token: result.access_token,
              isAuthenticated: true,
            });
          }
          return result;
        } catch (error) {
          set({ user: null, token: null, isAuthenticated: false });
          throw error;
        }
      },

      logout: () => {
        authApi.logout();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
        window.location.href = '/auth/login';
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, ...userData };
          set({ user: updatedUser });
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      },

      checkAuth: async () => {
        try {
          const token = authApi.getToken();
          const user = authApi.getUser();

          if (token && user) {
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } catch (error) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      hasRole: (role: SystemRole | string) => {
        const user = get().user;
        return user ? user.roles.includes(role) : false;
      },

      hasPermission: (permission: string) => {
        const user = get().user;
        return user ? user.permissions?.includes(permission) || false : false;
      },

      getUserType: () => {
        const user = get().user;
        return user?.userType || null;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    },
  ),
);
