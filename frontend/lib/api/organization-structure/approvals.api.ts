import api from "../client";
import {
  CreateStructureApprovalDto,
  UpdateApprovalDecisionDto,
  StructureApprovalResponseDto,
} from "../../../types/organization-structure";

export const approvalsApi = {
  /**
   * Create approval (System creates on submission)
   * System Admin assigns approvers
   */
  createApproval: async (
    data: CreateStructureApprovalDto
  ): Promise<StructureApprovalResponseDto> => {
    try {
      console.log("Creating approval:", data);
      const response: StructureApprovalResponseDto = await api.post(
        "/organization-structure/approvals",
        data
      );
      return response;
    } catch (error) {
      console.error("Error creating approval:", error);
      throw error;
    }
  },

  /**
   * REQ-OSM-04: System Admin makes approval decision
   * BR 36: Approval workflow enforcement
   * REQ-OSM-09: Validation rules applied
   */
  updateApprovalDecision: async (
    id: string,
    data: UpdateApprovalDecisionDto
  ): Promise<StructureApprovalResponseDto> => {
    try {
      console.log(`Updating approval decision for ${id}:`, data);
      const response: StructureApprovalResponseDto = await api.patch(
        `/organization-structure/approvals/${id}/decision`,
        data
      );
      return response;
    } catch (error) {
      console.error(`Error updating approval decision ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get approvals for a change request
   */
  getRequestApprovals: async (
    changeRequestId: string
  ): Promise<StructureApprovalResponseDto[]> => {
    try {
      console.log(`Fetching approvals for change request ${changeRequestId}`);
      const response: StructureApprovalResponseDto[] = await api.get(
        `/organization-structure/approvals/change-request/${changeRequestId}`
      );
      return response;
    } catch (error) {
      console.error(
        `Error fetching approvals for change request ${changeRequestId}:`,
        error
      );
      throw error;
    }
  },

  // Helper functions for approval management
  getDecisionDisplay: (
    decision: string
  ): { label: string; color: string; icon: string } => {
    const decisionMap: Record<
      string,
      { label: string; color: string; icon: string }
    > = {
      PENDING: { label: "Pending", color: "yellow", icon: "⏳" },
      APPROVED: { label: "Approved", color: "green", icon: "✅" },
      REJECTED: { label: "Rejected", color: "red", icon: "❌" },
    };
    return (
      decisionMap[decision] || { label: decision, color: "gray", icon: "❓" }
    );
  },

  isApprovalPending: (approval: StructureApprovalResponseDto): boolean => {
    return approval.decision === "PENDING";
  },
};
