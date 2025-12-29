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

    // Token is now in HTTP-only cookie, not in response body
    // Only return user data
    if (response.user) {
      return {
        access_token: "", // Not used anymore, kept for backward compatibility
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

    // Token is now in HTTP-only cookie, not in response body
    return {
      message: response.message || "Success",
      data: {
        access_token: "", // Not used anymore, kept for backward compatibility
        user: response.user as User,
      },
      success: true,
    };
  },

  logout: async (): Promise<void> => {
    // Call backend logout endpoint to clear cookie
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
      // Continue even if logout fails
    }
  },

  // Check authentication by calling a protected endpoint
  isAuthenticated: async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    
    try {
      // Try to fetch user profile - if it succeeds, user is authenticated
      await api.get("/employee-profile/me/profile");
      return true;
    } catch {
      return false;
    }
  },

  // Fetch user from API instead of localStorage
  getUser: async (): Promise<User | null> => {
    if (typeof window === "undefined") return null;

    try {
      const response = await api.get("/employee-profile/me/profile");
      // Response is already the data object (due to axios interceptor)
      // Backend returns: { message: '...', data: employee }
      // After interceptor: response = { message: '...', data: employee }
      // So response.data is the employee object
      const userData = response?.data || response;
      
      if (!userData || (typeof userData === 'object' && !userData._id && !userData.id && !userData.employeeNumber)) {
        return null;
      }
      
      // Transform to User format
      return {
        id: userData._id || userData.id,
        employeeNumber: userData.employeeNumber,
        candidateNumber: userData.candidateNumber,
        fullName: userData.fullName,
        workEmail: userData.workEmail,
        personalEmail: userData.personalEmail,
        roles: userData.roles || [],
        userType: userData.userType || (userData.employeeNumber ? "employee" : "candidate"),
        profilePictureUrl: userData.profilePictureUrl,
      } as User;
    } catch (error: any) {
      // Don't log 401 errors - they're expected when user is not authenticated
      // Only log unexpected errors in development
      if (process.env.NODE_ENV === 'development' && error?.status !== 401) {
        console.error('Failed to fetch user:', error?.message || error);
      }
      return null;
    }
  },

  getToken: (): string | null => {
    // Tokens are now in HTTP-only cookies, not accessible from JavaScript
    // Return null to indicate we're using cookie-based auth
    return null;
  },

  // Helper to get user ID - now fetches from API
  getUserId: async (): Promise<string | null> => {
    const user = await authApi.getUser();
    return user?.id || null;
  },
};
