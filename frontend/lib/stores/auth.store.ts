import { create } from "zustand";
import { authApi } from "../api/auth/auth";
import { User, LoginRequest, RegisterRequest } from "../../types";

type AuthState = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;

  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  initialize: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  initialize: () => {
    const token = authApi.getToken();
    const user = authApi.getUser();

    if (token && user) {
      set({
        token,
        user,
        isAuthenticated: true,
      });
    }
  },

  login: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await authApi.login(data);
      set({
        user: res.user,
        token: res.access_token,
        isAuthenticated: true,
        loading: false,
      });
    } catch (err: any) {
      set({
        error: err.message || "Login failed",
        loading: false,
      });
      throw err;
    }
  },

  register: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await authApi.register(data);
      set({
        user: res.data?.user || null,
        token: res.data?.access_token || null,
        isAuthenticated: true,
        loading: false,
      });
    } catch (err: any) {
      set({
        error: err.message || "Registration failed",
        loading: false,
      });
      throw err;
    }
  },

  logout: () => {
    authApi.logout();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },
}));
