import api from "../client";
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentResponseDto,
  DepartmentHierarchyNode,
  GetDepartmentsParams,
} from "../../../types/organization-structure";

export const departmentsApi = {
  /**
   * REQ-OSM-01: Create new department (System Admin only)
   */
  createDepartment: async (
    data: CreateDepartmentDto
  ): Promise<DepartmentResponseDto> => {
    try {
      console.log("Creating department:", data);
      const response: DepartmentResponseDto = await api.post(
        "/organization-structure/departments",
        data
      );
      return response;
    } catch (error) {
      console.error("Error creating department:", error);
      throw error;
    }
  },

  /**
   * REQ-SANV-01, REQ-SANV-02: View departments (All authenticated users)
   */
  getAllDepartments: async (
    params?: GetDepartmentsParams
  ): Promise<DepartmentResponseDto[]> => {
    try {
      console.log("Fetching departments with params:", params);
      const queryParams = new URLSearchParams();
      if (params?.isActive !== undefined) {
        queryParams.append("isActive", params.isActive.toString());
      }

      const url = `/organization-structure/departments${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;
      const response: DepartmentResponseDto[] = await api.get(url);
      return response;
    } catch (error) {
      console.error("Error fetching departments:", error);
      throw error;
    }
  },

  /**
   * REQ-SANV-01: View specific department details
   */
  getDepartmentById: async (id: string): Promise<DepartmentResponseDto> => {
    try {
      console.log("Fetching department by ID:", id);
      const response: DepartmentResponseDto = await api.get(
        `/organization-structure/departments/${id}`
      );
      return response;
    } catch (error) {
      console.error(`Error fetching department ${id}:`, error);
      throw error;
    }
  },

  /**
   * REQ-OSM-02: Update existing department (System Admin only)
   */
  updateDepartment: async (
    id: string,
    data: UpdateDepartmentDto
  ): Promise<DepartmentResponseDto> => {
    try {
      console.log(`Updating department ${id}:`, data);
      const response: DepartmentResponseDto = await api.put(
        `/organization-structure/departments/${id}`,
        data
      );
      return response;
    } catch (error) {
      console.error(`Error updating department ${id}:`, error);
      throw error;
    }
  },

  /**
   * REQ-OSM-05: Deactivate department (System Admin only)
   * BR 12, BR 37: Historical records preserved
   */
  deactivateDepartment: async (id: string): Promise<DepartmentResponseDto> => {
    try {
      console.log(`Deactivating department ${id}`);
      const response: DepartmentResponseDto = await api.delete(
        `/organization-structure/departments/${id}`
      );
      return response;
    } catch (error) {
      console.error(`Error deactivating department ${id}:`, error);
      throw error;
    }
  },

  /**
   * REQ-SANV-01: View department hierarchy (All users)
   * BR 24: Organizational structure viewable as graphical chart
   */
  getDepartmentHierarchy: async (): Promise<DepartmentHierarchyNode> => {
    try {
      console.log("Fetching department hierarchy");
      const response: DepartmentHierarchyNode = await api.get(
        "/organization-structure/departments/hierarchy/all"
      );
      return response;
    } catch (error) {
      console.error("Error fetching department hierarchy:", error);
      throw error;
    }
  },
};
