import api from "../client";
import {
  CreateStructureChangeRequestDto,
  UpdateStructureChangeRequestDto,
  SubmitChangeRequestDto,
  StructureChangeRequestResponseDto,
  GetChangeRequestsParams,
  StructureRequestStatus,
} from "../../../types/organization-structure";

export const changeRequestsApi = {
  /**
   * REQ-OSM-03: Manager submits change request
   * BR 36: All changes via workflow approval
   */
  createChangeRequest: async (
    data: CreateStructureChangeRequestDto
  ): Promise<StructureChangeRequestResponseDto> => {
    try {
      console.log("Creating change request:", data);
      const response: StructureChangeRequestResponseDto = await api.post(
        "/organization-structure/change-requests",
        data
      );
      return response;
    } catch (error) {
      console.error("Error creating change request:", error);
      throw error;
    }
  },

  /**
   * REQ-OSM-04: View change requests
   * System Admin reviews all, Managers see their own
   */
  getAllChangeRequests: async (
    params?: GetChangeRequestsParams
  ): Promise<StructureChangeRequestResponseDto[]> => {
    try {
      console.log("Fetching change requests with params:", params);
      const queryParams = new URLSearchParams();

      if (params?.status) {
        queryParams.append("status", params.status);
      }

      const url = `/organization-structure/change-requests${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;
      const response: StructureChangeRequestResponseDto[] = await api.get(url);
      return response;
    } catch (error) {
      console.error("Error fetching change requests:", error);
      throw error;
    }
  },

  /**
   * View specific change request
   */
  getChangeRequestById: async (
    id: string
  ): Promise<StructureChangeRequestResponseDto> => {
    try {
      console.log("Fetching change request by ID:", id);
      const response: StructureChangeRequestResponseDto = await api.get(
        `/organization-structure/change-requests/${id}`
      );
      return response;
    } catch (error) {
      console.error(`Error fetching change request ${id}:`, error);
      throw error;
    }
  },

  /**
   * Update change request (Only requester can update draft)
   * REQ-OSM-03: Manager modifies draft request
   */
  updateChangeRequest: async (
    id: string,
    data: UpdateStructureChangeRequestDto
  ): Promise<StructureChangeRequestResponseDto> => {
    try {
      console.log(`Updating change request ${id}:`, data);
      const response: StructureChangeRequestResponseDto = await api.put(
        `/organization-structure/change-requests/${id}`,
        data
      );
      return response;
    } catch (error) {
      console.error(`Error updating change request ${id}:`, error);
      throw error;
    }
  },

  /**
   * Submit change request for approval
   * REQ-OSM-03: Manager submits request for approval
   * BR 36: Changes require workflow approval
   */
  submitChangeRequest: async (
    id: string,
    data: SubmitChangeRequestDto
  ): Promise<StructureChangeRequestResponseDto> => {
    try {
      console.log(`Submitting change request ${id}:`, data);
      const response: StructureChangeRequestResponseDto = await api.post(
        `/organization-structure/change-requests/${id}/submit`,
        data
      );
      return response;
    } catch (error) {
      console.error(`Error submitting change request ${id}:`, error);
      throw error;
    }
  },

  /**
   * Cancel change request
   */
  cancelChangeRequest: async (
    id: string
  ): Promise<StructureChangeRequestResponseDto> => {
    try {
      console.log(`Cancelling change request ${id}`);
      const response: StructureChangeRequestResponseDto = await api.post(
        `/organization-structure/change-requests/${id}/cancel`
      );
      return response;
    } catch (error) {
      console.error(`Error cancelling change request ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get approved request form data for populating create/update forms
   * REQ-OSM-04: System Admin uses this to populate forms
   */
  getApprovedRequestFormData: async (id: string): Promise<{
    requestType: string;
    formData: any;
    redirectUrl: string;
  }> => {
    try {
      console.log(`Getting form data for approved request ${id}`);
      const response = await api.get(
        `/organization-structure/change-requests/${id}/form-data`
      );
      return response.data;
    } catch (error) {
      console.error(`Error getting form data for request ${id}:`, error);
      throw error;
    }
  },

  /**
   * System Admin approves a change request directly
   */
  approveChangeRequest: async (
    id: string,
    comments?: string
  ): Promise<StructureChangeRequestResponseDto> => {
    try {
      console.log(`Approving change request ${id}`);
      const response: StructureChangeRequestResponseDto = await api.post(
        `/organization-structure/change-requests/${id}/approve`,
        { comments }
      );
      return response;
    } catch (error) {
      console.error(`Error approving change request ${id}:`, error);
      throw error;
    }
  },

  /**
   * System Admin rejects a change request directly
   */
  rejectChangeRequest: async (
    id: string,
    comments?: string
  ): Promise<StructureChangeRequestResponseDto> => {
    try {
      console.log(`Rejecting change request ${id}`);
      const response: StructureChangeRequestResponseDto = await api.post(
        `/organization-structure/change-requests/${id}/reject`,
        { comments }
      );
      return response;
    } catch (error) {
      console.error(`Error rejecting change request ${id}:`, error);
      throw error;
    }
  },

  /**
   * Mark change request as IMPLEMENTED after form submission
   */
  markRequestAsImplemented: async (
    id: string
  ): Promise<StructureChangeRequestResponseDto> => {
    try {
      console.log(`Marking change request ${id} as IMPLEMENTED`);
      const response: StructureChangeRequestResponseDto = await api.post(
        `/organization-structure/change-requests/${id}/mark-implemented`
      );
      return response;
    } catch (error) {
      console.error(`Error marking request ${id} as IMPLEMENTED:`, error);
      throw error;
    }
  },

  // Helper functions for status management
  getStatusDisplay: (
    status: StructureRequestStatus
  ): { label: string; color: string } => {
    const statusMap: Record<
      StructureRequestStatus,
      { label: string; color: string }
    > = {
      [StructureRequestStatus.DRAFT]: { label: "Draft", color: "gray" },
      [StructureRequestStatus.SUBMITTED]: { label: "Submitted", color: "blue" },
      [StructureRequestStatus.UNDER_REVIEW]: {
        label: "Under Review",
        color: "yellow",
      },
      [StructureRequestStatus.APPROVED]: { label: "Approved", color: "green" },
      [StructureRequestStatus.REJECTED]: { label: "Rejected", color: "red" },
      [StructureRequestStatus.CANCELED]: { label: "Canceled", color: "gray" },
      [StructureRequestStatus.IMPLEMENTED]: {
        label: "Implemented",
        color: "purple",
      },
    };
    return statusMap[status] || { label: status, color: "gray" };
  },

  getRequestTypeDisplay: (type: string): { label: string; icon: string } => {
    const typeMap: Record<string, { label: string; icon: string }> = {
      NEW_DEPARTMENT: { label: "New Department", icon: "🏢" },
      UPDATE_DEPARTMENT: { label: "Update Department", icon: "✏️" },
      NEW_POSITION: { label: "New Position", icon: "🧑‍💼" },
      UPDATE_POSITION: { label: "Update Position", icon: "📝" },
      CLOSE_POSITION: { label: "Close Position", icon: "🚫" },
    };
    return typeMap[type] || { label: type, icon: "❓" };
  },
};
