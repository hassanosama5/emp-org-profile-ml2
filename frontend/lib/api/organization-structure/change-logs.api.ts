import api from "../client";
import {
  StructureChangeLogResponseDto,
  GetChangeLogsParams,
} from "../../../types/organization-structure";

export const changeLogsApi = {
  /**
   * View change logs (Admin only)
   * REQ-OSM-11: Audit trail for structural changes
   * BR 22: Version history and audit logs
   */
  getChangeLogs: async (
    params?: GetChangeLogsParams
  ): Promise<StructureChangeLogResponseDto[]> => {
    try {
      console.log("Fetching change logs with params:", params);
      const queryParams = new URLSearchParams();

      if (params?.entityType) {
        queryParams.append("entityType", params.entityType);
      }
      if (params?.entityId) {
        queryParams.append("entityId", params.entityId);
      }

      const url = `/organization-structure/change-logs${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;
      const response: StructureChangeLogResponseDto[] = await api.get(url);
      return response;
    } catch (error) {
      console.error("Error fetching change logs:", error);
      throw error;
    }
  },

  /**
   * Get change logs for specific entity
   * BR 22: Detailed audit trail
   */
  getEntityChangeLogs: async (
    entityType: string,
    entityId: string
  ): Promise<StructureChangeLogResponseDto[]> => {
    try {
      console.log(`Fetching change logs for ${entityType}/${entityId}`);
      const response: StructureChangeLogResponseDto[] = await api.get(
        `/organization-structure/change-logs/${entityType}/${entityId}`
      );
      return response;
    } catch (error) {
      console.error(
        `Error fetching change logs for ${entityType}/${entityId}:`,
        error
      );
      throw error;
    }
  },

  // Helper functions for change log display
  getActionDisplay: (
    action: string
  ): { label: string; color: string; icon: string } => {
    const actionMap: Record<
      string,
      { label: string; color: string; icon: string }
    > = {
      CREATED: { label: "Created", color: "green", icon: "➕" },
      UPDATED: { label: "Updated", color: "blue", icon: "✏️" },
      DEACTIVATED: { label: "Deactivated", color: "red", icon: "🚫" },
      REASSIGNED: { label: "Reassigned", color: "purple", icon: "🔄" },
    };
    return actionMap[action] || { label: action, color: "gray", icon: "❓" };
  },
};
