import api from "../client";
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  AuthApiResponse,
  ApiResponse,
  User,
} from "../../../types";

export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = (await api.post(
      "/auth/login",
      credentials
    )) as AuthApiResponse;

    if (response.access_token && response.user) {
      localStorage.setItem("auth_token", response.access_token);
      localStorage.setItem("user", JSON.stringify(response.user));
      if (typeof document !== "undefined") {
        document.cookie = `auth_token=${response.access_token}; path=/; SameSite=Lax`;
      }
      return {
        access_token: response.access_token,
        user: response.user,
      };
    }

    throw new Error(response.message || "Login failed");
  },

  register: async (data: RegisterRequest): Promise<ApiResponse> => {
    const response = (await api.post(
      "/auth/register",
      data
    )) as AuthApiResponse;

    if (response.access_token && response.user) {
      localStorage.setItem("auth_token", response.access_token);
      localStorage.setItem("user", JSON.stringify(response.user));
      if (typeof document !== "undefined") {
        document.cookie = `auth_token=${response.access_token}; path=/; SameSite=Lax`;
      }
    }

    return {
      message: response.message || "Success",
      data: {
        access_token: response.access_token || "",
        user: response.user as User,
      },
      success: true,
    };
  },

  logout: async (): Promise<void> => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    if (typeof document !== "undefined") {
      document.cookie = "auth_token=; path=/; Max-Age=0; SameSite=Lax";
    }
  },

  isAuthenticated: (): boolean => {
    if (typeof window === "undefined") return false;
    const token = localStorage.getItem("auth_token");
    return !!token;
  },

  getUser: (): User | null => {
    if (typeof window === "undefined") return null;
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  getToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth_token");
  },

  // Helper to get user ID from token (from JWT payload)
  getUserId: (): string | null => {
    // Call getToken method directly, not using 'this'
    const token = authApi.getToken();
    if (!token) return null;

    try {
      // Decode JWT token to get user ID
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.sub || null;
    } catch {
      return null;
    }
  },
};
