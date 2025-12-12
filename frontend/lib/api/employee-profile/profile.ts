// lib/api/employee-profile/profile.ts - UPDATED
import api from "../client";
import type {
  EmployeeProfile,
  ProfileChangeRequest,
  TeamMember,
  UpdateProfileDto,
} from "@/types";

// Helper to extract data from API response
const extractData = <T>(response: any): T | null => {
  if (!response) return null;

  // If response is already the expected type
  if (Array.isArray(response)) {
    return response as unknown as T;
  }

  if (typeof response === "object") {
    // Check for common backend response formats
    if ("data" in response) {
      const data = response.data;

      // Handle nested data.data structure
      if (data && typeof data === "object" && "data" in data) {
        return data.data as T;
      }

      // If data is an object with items/content field
      if (data && typeof data === "object") {
        if ("items" in data) return data.items as T;
        if ("content" in data) return data.content as T;
      }

      return data as T;
    }

    // If response contains items/content directly
    if ("items" in response) return response.items as T;
    if ("content" in response) return response.content as T;

    // Return as-is for object responses
    return response as T;
  }

  return null;
};

export const employeeProfileApi = {
  // Get current user's profile
  getMyProfile: async () => {
    const response = await api.get("/employee-profile/me/profile");
    return extractData<EmployeeProfile>(response) || response;
  },

  // Update current user's profile
  updateMyProfile: async (data: UpdateProfileDto) => {
    const response = await api.patch("/employee-profile/me", data);
    return extractData<EmployeeProfile>(response) || response;
  },

  // Get employee by ID (for HR/admin views)
  getEmployeeById: async (id: string) => {
    const response = await api.get(`/employee-profile/${id}`);
    return extractData<EmployeeProfile>(response) || response;
  },

  // Submit a change request
  submitChangeRequest: async (data: {
    requestDescription: string;
    reason?: string;
  }) => {
    const response = await api.post("/employee-profile/change-request", data);
    return extractData<ProfileChangeRequest>(response) || response;
  },

  // Get my change requests
  getMyChangeRequests: async () => {
    const response = await api.get(
      "/employee-profile/change-request/my-requests"
    );
    const data = extractData<ProfileChangeRequest[]>(response);
    return Array.isArray(data) ? data : [];
  },

  // Get pending change requests for approval (HR)
  getPendingChangeRequests: async (params?: {
    status?: string;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await api.get("/employee-profile/change-request/pending", {
      params: { ...params, status: "PENDING" },
    });

    const data = extractData<ProfileChangeRequest[]>(response);
    return Array.isArray(data) ? data : [];
  },

  // Approve change request
  approveChangeRequest: async (id: string, reason?: string) => {
    const response = await api.patch(
      `/employee-profile/change-request/${id}/approve`,
      { reason }
    );
    return extractData<ProfileChangeRequest>(response) || response;
  },

  // Reject change request
  rejectChangeRequest: async (id: string, reason?: string) => {
    const response = await api.patch(
      `/employee-profile/change-request/${id}/reject`,
      { reason }
    );
    return extractData<ProfileChangeRequest>(response) || response;
  },

  // Get all employees (HR only)
  getAllEmployees: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    departmentId?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) => {
    const response = await api.get("/employee-profile", { params });

    // Handle paginated response
    if (response && typeof response === "object" && "data" in response) {
      return response as unknown as {
        data: EmployeeProfile[];
        meta: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      };
    }

    return {
      data: extractData<EmployeeProfile[]>(response) || [],
      meta: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      },
    };
  },

  // Get team members
  getMyTeam: async () => {
    const response = await api.get("/employee-profile/team/members");
    const data = extractData<TeamMember[]>(response);
    return Array.isArray(data) ? data : [];
  },
};
