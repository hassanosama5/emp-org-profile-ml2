import api from "../client";
import {
  CreatePositionDto,
  UpdatePositionDto,
  PositionResponseDto,
  PositionHierarchyNode,
  GetPositionsParams,
} from "../../../types/organization-structure";

// Helper function to extract error message
const extractErrorMessage = (error: any): string => {
  if (!error) return "Unknown error occurred";

  // If it's already an Error object with message
  if (error instanceof Error) {
    return error.message;
  }

  // Check for response data
  if (error.response?.data) {
    const data = error.response.data;

    if (typeof data === "string") {
      return data;
    }

    if (data.message) {
      return data.message;
    }

    if (data.error) {
      return data.error;
    }

    // Try to stringify object
    try {
      return JSON.stringify(data);
    } catch (e) {
      return "Error parsing response";
    }
  }

  // Fallback
  if (error.message) {
    return error.message;
  }

  if (error.response?.status) {
    return `HTTP ${error.response.status} error`;
  }

  return "Unknown error occurred";
};

export const positionsApi = {
  /**
   * REQ-OSM-01: Create new position (System Admin only)
   */
  createPosition: async (
    data: CreatePositionDto
  ): Promise<PositionResponseDto> => {
    try {
      console.log("Creating position:", data);
      const response: PositionResponseDto = await api.post(
        "/organization-structure/positions",
        data
      );
      return response;
    } catch (error: any) {
      const errorMessage = extractErrorMessage(error);
      console.error("Error creating position:", errorMessage);
      throw new Error(errorMessage);
    }
  },

  /**
   * REQ-SANV-01: View positions
   */
  getAllPositions: async (
    params?: GetPositionsParams & { search?: string }
  ): Promise<PositionResponseDto[]> => {
    try {
      const queryParams = new URLSearchParams();

      if (params?.departmentId) {
        queryParams.append("departmentId", params.departmentId);
      }
      if (params?.isActive !== undefined) {
        queryParams.append("isActive", params.isActive.toString());
      }
      if (params?.search) {
        queryParams.append("search", params.search);
      }

      const url = `/organization-structure/positions${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;
      const response: PositionResponseDto[] = await api.get(url);
      return response;
    } catch (error: any) {
      const errorMessage = extractErrorMessage(error);
      console.error("Error fetching positions:", errorMessage);
      throw new Error(errorMessage);
    }
  },

  /**
   * REQ-SANV-01: View specific position details
   */
  getPositionById: async (id: string): Promise<PositionResponseDto> => {
    try {
      const response: PositionResponseDto = await api.get(
        `/organization-structure/positions/${id}`
      );
      return response;
    } catch (error: any) {
      const errorMessage = extractErrorMessage(error);
      console.error(`Error fetching position ${id}:`, errorMessage);
      throw new Error(errorMessage);
    }
  },

  /**
   * REQ-OSM-02: Update existing position
   */
  updatePosition: async (
    id: string,
    data: UpdatePositionDto
  ): Promise<PositionResponseDto> => {
    try {
      console.log(`Updating position ${id} with data:`, data);

      // Log the actual data being sent
      const requestData = { ...data };
      console.log("Request payload:", requestData);

      const response: PositionResponseDto = await api.put(
        `/organization-structure/positions/${id}`,
        requestData
      );
      console.log("Update successful:", response);
      return response;
    } catch (error: any) {
      console.error(`Error updating position ${id}:`, error);
      console.error("Error details:", {
        message: error.message,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
        responseHeaders: error.response?.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data,
          headers: error.config?.headers,
        },
      });

      const errorMessage = extractErrorMessage(error);
      throw new Error(errorMessage);
    }
  },

  /**
   * REQ-OSM-05: Deactivate position
   */
  deactivatePosition: async (id: string): Promise<PositionResponseDto> => {
    try {
      console.log(`Deactivating position ${id}`);
      const response: PositionResponseDto = await api.delete(
        `/organization-structure/positions/${id}`
      );
      return response;
    } catch (error: any) {
      const errorMessage = extractErrorMessage(error);
      console.error(`Error deactivating position ${id}:`, errorMessage);
      throw new Error(errorMessage);
    }
  },

  /**
   * View position hierarchy
   */
  getPositionHierarchy: async (id: string): Promise<PositionHierarchyNode> => {
    try {
      const response: PositionHierarchyNode = await api.get(
        `/organization-structure/positions/${id}/hierarchy`
      );
      return response;
    } catch (error: any) {
      const errorMessage = extractErrorMessage(error);
      console.error(`Error fetching position hierarchy ${id}:`, errorMessage);
      throw new Error(errorMessage);
    }
  },
};
