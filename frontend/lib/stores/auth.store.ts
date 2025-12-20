import { create } from "zustand";
import { authApi } from "../api/auth/auth";
import { User, LoginRequest, RegisterRequest } from "../../types";

type AuthState = {
  user: User | null;
  token: string | null; // Kept for backward compatibility, but always null (token in cookie)
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;

  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
};

export const useAuthStore = create<AuthState>((set, get) => {
  // Initialize with empty state - user will be fetched asynchronously
  return {
    user: null,
    token: null, // Token is in HTTP-only cookie, not accessible from JS
    isAuthenticated: false,
    loading: false,
    error: null,

  initialize: async () => {
    // Don't initialize if we already have a user (e.g., from login)
    const currentState = get();
    if (currentState.user && currentState.isAuthenticated) {
      return;
    }
    
    // Set loading to true initially to prevent premature redirects
    set({ loading: true });
    
    try {
      // Fetch user from API (cookie-based auth)
      const user = await authApi.getUser();
      
      if (user) {
        set({
          token: null, // Token is in HTTP-only cookie, not stored
          user,
          isAuthenticated: true,
          loading: false,
        });
      } else {
        // No user found
        set({
          isAuthenticated: false,
          loading: false,
        });
      }
    } catch (error: any) {
      // Failed to fetch user - not authenticated
      // 401 errors are expected when user is not logged in - don't log them
      if (error?.status !== 401 && process.env.NODE_ENV === 'development') {
        console.error('Auth initialization error:', error);
      }
      set({
        isAuthenticated: false,
        loading: false,
      });
    }
  },

  login: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await authApi.login(data);
      // Cookie is set by backend, user data is in response
      // Small delay to ensure cookie is processed by browser
      await new Promise(resolve => setTimeout(resolve, 100));
      set({
        user: res.user,
        token: null, // Token is in HTTP-only cookie, not stored
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
        token: null, // Token is in HTTP-only cookie, not stored
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

  logout: async () => {
    await authApi.logout();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  updateUser: (updates) => {
    set((state) => {
      if (!state.user) return state;

      // If updating profile picture, add cache-busting timestamp for display
      // Extract clean URL (remove existing timestamp if any)
      const cleanProfilePictureUrl = updates.profilePictureUrl
        ? updates.profilePictureUrl.split('?')[0]
        : state.user.profilePictureUrl?.split('?')[0];

      const processedUpdates = updates.profilePictureUrl
        ? {
            ...updates,
            profilePictureUrl: `${cleanProfilePictureUrl}?t=${Date.now()}`,
          }
        : updates;

      const updatedUser = {
        ...state.user,
        ...processedUpdates,
      };

      // No localStorage - user data is fetched from API
      return { user: updatedUser };
    });
  },
}});
