// lib/api/employee-profile/employee-profile.ts - CORRECTED
import api from "../client";
import type {
  EmployeeProfile,
  ProfileChangeRequest,
  TeamMember,
  UpdateProfileDto,
} from "@/types";

// Helper to extract data from nested responses
const extractData = <T>(response: any): T | null => {
  if (!response) return null;

  console.log("🔍 Extracting data from:", {
    type: typeof response,
    isArray: Array.isArray(response),
    hasData: response && typeof response === "object" && "data" in response,
  });

  // If response is already an array, return it
  if (Array.isArray(response)) {
    return response as unknown as T;
  }

  // If response is an object
  if (response && typeof response === "object") {
    // Check for different response structures
    if ("data" in response) {
      const data = response.data;

      // If data is already the right type
      if (Array.isArray(data)) {
        return data as T;
      }

      // If data is object with nested data
      if (data && typeof data === "object") {
        if ("data" in data && Array.isArray(data.data)) {
          return data.data as T;
        }
        if ("items" in data && Array.isArray(data.items)) {
          return data.items as T;
        }
        if ("requests" in data && Array.isArray(data.requests)) {
          return data.requests as T;
        }
        if ("content" in data && Array.isArray(data.content)) {
          return data.content as T;
        }
      }

      // If data is not array, return as-is
      return data as T;
    }

    // Check for other common response formats
    if ("items" in response && Array.isArray(response.items)) {
      return response.items as T;
    }
    if ("content" in response && Array.isArray(response.content)) {
      return response.content as T;
    }
    if ("requests" in response && Array.isArray(response.requests)) {
      return response.requests as T;
    }

    // Return as-is for object responses
    return response as T;
  }

  return null;
};

export const employeeProfileApi = {
  // Get current user's profile
  getMyProfile: async () => {
    const response = await api.get<EmployeeProfile>(
      "/employee-profile/me/profile"
    );
    return extractData<EmployeeProfile>(response) || response;
  },

  // Update current user's profile (self-service fields only)
  updateMyProfile: (data: UpdateProfileDto) =>
    api.patch<EmployeeProfile>("/employee-profile/me", data),

  // Upload profile picture
  uploadProfilePicture: (formData: FormData) =>
    api.post<{ profilePictureUrl: string }>(
      "/employee-profile/me/photo",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    ),

  // Get employee by ID (for HR/admin views)
  getEmployeeById: async (id: string) => {
    const response = await api.get<EmployeeProfile>(`/employee-profile/${id}`);
    return extractData<EmployeeProfile>(response) || response;
  },

  // Submit a change request
  submitChangeRequest: (data: {
    requestDescription: string;
    reason?: string;
  }) =>
    api.post<ProfileChangeRequest>("/employee-profile/change-request", data),

  // Get my change requests
  getMyChangeRequests: async () => {
    const response = await api.get<ProfileChangeRequest[]>(
      "/employee-profile/change-request/my-requests"
    );
    const data = extractData<ProfileChangeRequest[]>(response);
    return Array.isArray(data) ? data : [];
  },

  // Cancel a change request
  cancelChangeRequest: (id: string) =>
    api.patch<ProfileChangeRequest>(
      `/employee-profile/change-request/${id}/cancel`
    ),

  // Get team members (for department heads/managers)
  getMyTeam: async () => {
    const response = await api.get<TeamMember[]>(
      "/employee-profile/team/members"
    );
    const data = extractData<TeamMember[]>(response);
    return Array.isArray(data) ? data : [];
  },

  // Get team statistics
  getTeamStatistics: () =>
    api.get<unknown>("/employee-profile/team/statistics"),

  // HR Admin functions - Get all employees
  getAllEmployees: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    departmentId?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) => {
    console.log("🔍 Calling getAllEmployees with params:", params);

    try {
      const response = await api.get("/employee-profile", { params });

      console.log("✅ Backend response:", response);

      // Backend returns: { message: "...", data: [...] }
      // Extract the data array
      let data = response;

      if (response && typeof response === "object") {
        // If response has 'data' property
        if ("data" in response) {
          data = response.data;

          // If data is nested again (data.data)
          if (data && typeof data === "object" && "data" in data) {
            data = data.data;
          }
        }
      }

      // Ensure we return the expected structure
      const employeesArray = Array.isArray(data) ? data : [];

      return {
        data: employeesArray,
        meta: {
          total: employeesArray.length,
          page: params?.page || 1,
          limit: params?.limit || 10,
          totalPages: Math.ceil(employeesArray.length / (params?.limit || 10)),
        },
      };
    } catch (error: any) {
      console.error("❌ Error in getAllEmployees:", error.message);
      return {
        data: [],
        meta: {
          total: 0,
          page: params?.page || 1,
          limit: params?.limit || 10,
          totalPages: 0,
        },
      };
    }
  },

  updateEmployee: (id: string, data: Partial<EmployeeProfile>) =>
    api.patch<EmployeeProfile>(`/employee-profile/${id}`, data),

  // ========== CORRECTED: Change request approvals ==========
  // Based on your backend: @Get('change-request') with HR roles
  // lib/api/employee-profile/employee-profile.ts
  getPendingChangeRequests: async (params?: {
    status?: string;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    console.log("📞 Using WORKING endpoint...");

    // Build query
    const queryParams: Record<string, any> = {};
    if (params?.status) queryParams.status = params.status;
    if (params?.employeeId && params.employeeId.trim() !== "") {
      queryParams.employeeId = params.employeeId;
    }
    if (params?.startDate) queryParams.startDate = params.startDate;
    if (params?.endDate) queryParams.endDate = params.endDate;

    try {
      // Use the copy endpoint that works
      const response = await api.get<ProfileChangeRequest[]>(
        "/employee-profile/change-request/copy",
        { params: queryParams }
      );

      // Extract data
      const data =
        response && typeof response === "object" && "data" in response
          ? response.data
          : response;

      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("❌ Even copy endpoint failed:", error);
      return [];
    }
  },
  approveChangeRequest: (id: string, reason?: string) =>
    api.patch<ProfileChangeRequest>(
      `/employee-profile/change-request/${id}/approve`,
      { reason }
    ),

  rejectChangeRequest: (id: string, reason?: string) =>
    api.patch<ProfileChangeRequest>(
      `/employee-profile/change-request/${id}/reject`,
      { reason }
    ),

  // Export functions
  exportToExcel: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    departmentId?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => api.get<string>("/employee-profile/export/excel", { params }),

  // In lib/api/employee-profile/employee-profile.ts
  exportToPdf: async (id: string): Promise<string> => {
    const response = await api.get<{ message: string; data: string }>(
      `/employee-profile/${id}/pdf`
    );
    return (response.data as any).data || response.data; // This should be the base64 string
  },

  // Update contact info
  updateMyContact: (data: {
    personalEmail?: string;
    mobilePhone?: string;
    homePhone?: string;
    address?: {
      city?: string;
      streetAddress?: string;
      country?: string;
    };
  }) => api.patch<EmployeeProfile>("/employee-profile/me/contact", data),

  // Update banking info
  updateMyBanking: (data: { bankName?: string; bankAccountNumber?: string }) =>
    api.patch<EmployeeProfile>("/employee-profile/me/banking", data),

  // Update biography
  updateMyBiography: (data: { biography?: string }) =>
    api.patch<EmployeeProfile>("/employee-profile/me/biography", data),

  // Search functions
  searchByEmployeeNumber: async (employeeNumber: string) => {
    const response = await api.get<EmployeeProfile>(
      `/employee-profile/search/by-number/${employeeNumber}`
    );
    return extractData<EmployeeProfile>(response) || response;
  },

  searchByNationalId: async (nationalId: string) => {
    const response = await api.get<EmployeeProfile>(
      `/employee-profile/search/by-national-id/${nationalId}`
    );
    return extractData<EmployeeProfile>(response) || response;
  },

  // Get department employees
  getDepartmentEmployees: async (departmentId: string) => {
    const response = await api.get<EmployeeProfile[]>(
      `/employee-profile/department/${departmentId}`
    );
    const data = extractData<EmployeeProfile[]>(response);
    return Array.isArray(data) ? data : [];
  },

  // Helper function to debug API responses
  debugResponse: async (endpoint: string) => {
    console.log(`🔍 DEBUG - Calling endpoint: ${endpoint}`);
    try {
      const response = await api.get(endpoint);
      console.log(`✅ DEBUG - Response from ${endpoint}:`, response);
      console.log(`📊 DEBUG - Response type:`, typeof response);
      console.log(`📊 DEBUG - Is array:`, Array.isArray(response));
      console.log(
        `📊 DEBUG - Object keys:`,
        response && typeof response === "object" ? Object.keys(response) : []
      );
      return response;
    } catch (error: any) {
      console.error(`❌ DEBUG - Error from ${endpoint}:`, error.message);
      throw error;
    }
  },

  // Simple direct method for testing
  getPendingChangeRequestsDirect: async () => {
    try {
      const response = await api.get("/employee-profile/change-request/copy", {
        params: { status: "PENDING" },
      });
      console.log("Direct method response:", response);

      // Simple extraction
      if (response && response.data && Array.isArray(response.data)) {
        return response.data;
      }
      if (Array.isArray(response)) {
        return response;
      }
      return [];
    } catch (error) {
      console.error("Direct method error:", error);
      return [];
    }
  },
};
