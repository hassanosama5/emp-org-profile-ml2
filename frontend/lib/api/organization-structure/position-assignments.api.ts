import api from "../client";
import {
  CreatePositionAssignmentDto,
  UpdatePositionAssignmentDto,
  PositionAssignmentResponseDto,
  GetEmployeeAssignmentsParams,
} from "../../../types/organization-structure";

export const positionAssignmentsApi = {
  /**
   * Create position assignment (HR Admin and System Admin)
   */
  createPositionAssignment: async (
    data: CreatePositionAssignmentDto
  ): Promise<PositionAssignmentResponseDto> => {
    try {
      console.log("Creating position assignment:", JSON.stringify(data, null, 2));
      const response: PositionAssignmentResponseDto = await api.post(
        "/organization-structure/assignments",
        data
      );
      console.log("Assignment created successfully:", response);
      return response;
    } catch (error: any) {
      console.error("Error creating position assignment:", error);
      console.error("Error details:", {
        message: error?.message,
        status: error?.status,
        responseData: error?.responseData,
        validationErrors: error?.validationErrors,
      });
      throw error;
    }
  },

  /**
   * View employee assignments
   * Employees can view their own, Managers can view team, Admins can view all
   * BR 41: Role-based access
   */
  getEmployeeAssignments: async (
    employeeProfileId: string,
    params?: GetEmployeeAssignmentsParams
  ): Promise<PositionAssignmentResponseDto[]> => {
    try {
      console.log(
        `Fetching assignments for employee ${employeeProfileId}:`,
        params
      );
      const queryParams = new URLSearchParams();

      if (params?.activeOnly) {
        queryParams.append("activeOnly", "true");
      }

      const url = `/organization-structure/assignments/employee/${employeeProfileId}${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;
      const response: PositionAssignmentResponseDto[] = await api.get(url);
      return response;
    } catch (error) {
      console.error(
        `Error fetching assignments for employee ${employeeProfileId}:`,
        error
      );
      throw error;
    }
  },

  /**
   * View position assignments (Admin and Managers)
   */
  getPositionAssignments: async (
    positionId: string
  ): Promise<PositionAssignmentResponseDto[]> => {
    try {
      console.log(`Fetching assignments for position ${positionId}`);
      const response: PositionAssignmentResponseDto[] = await api.get(
        `/organization-structure/assignments/position/${positionId}`
      );
      return response;
    } catch (error) {
      console.error(
        `Error fetching assignments for position ${positionId}:`,
        error
      );
      throw error;
    }
  },

  /**
   * Update position assignment (HR Admin and System Admin only)
   */
  updatePositionAssignment: async (
    id: string,
    data: UpdatePositionAssignmentDto
  ): Promise<PositionAssignmentResponseDto> => {
    try {
      console.log(`Updating position assignment ${id}:`, data);
      const response: PositionAssignmentResponseDto = await api.patch(
        `/organization-structure/assignments/${id}`,
        data
      );
      return response;
    } catch (error) {
      console.error(`Error updating position assignment ${id}:`, error);
      throw error;
    }
  },

  /**
   * End position assignment (HR Admin and System Admin only)
   */
  endPositionAssignment: async (
    id: string,
    endDate: string | Date
  ): Promise<PositionAssignmentResponseDto> => {
    try {
      console.log(`Ending position assignment ${id} on ${endDate}`);
      const response: PositionAssignmentResponseDto = await api.patch(
        `/organization-structure/assignments/${id}/end`,
        {
          endDate:
            typeof endDate === "string" ? endDate : endDate.toISOString(),
        }
      );
      return response;
    } catch (error) {
      console.error(`Error ending position assignment ${id}:`, error);
      throw error;
    }
  },

  // Helper function to check if assignment is active
  isAssignmentActive: (assignment: PositionAssignmentResponseDto): boolean => {
    if (!assignment.endDate) return true;
    const endDate = new Date(assignment.endDate);
    const now = new Date();
    return now <= endDate;
  },
};
