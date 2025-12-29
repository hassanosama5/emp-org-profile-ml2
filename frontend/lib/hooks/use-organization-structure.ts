import { useState, useCallback } from "react";
import {
  departmentsApi,
  positionsApi,
  changeRequestsApi,
  approvalsApi,
  positionAssignmentsApi,
  changeLogsApi,
} from "../api/organization-structure/organization-structure";
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  CreatePositionDto,
  UpdatePositionDto,
  CreatePositionAssignmentDto,
  UpdatePositionAssignmentDto,
  CreateStructureChangeRequestDto,
  UpdateStructureChangeRequestDto,
  SubmitChangeRequestDto,
  CreateStructureApprovalDto,
  UpdateApprovalDecisionDto,
  GetDepartmentsParams,
  GetPositionsParams,
  GetChangeRequestsParams,
  GetChangeLogsParams,
  GetEmployeeAssignmentsParams,
  StructureRequestStatus,
  ApprovalDecision,
} from "../../types/organization-structure";

export const useOrganizationStructure = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============ DEPARTMENT HOOKS ============
  const createDepartment = useCallback(async (data: CreateDepartmentDto) => {
    setLoading(true);
    setError(null);
    try {
      const response = await departmentsApi.createDepartment(data);
      setLoading(false);
      return response;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create department"
      );
      setLoading(false);
      throw err;
    }
  }, []);

  const getDepartments = useCallback(async (params?: GetDepartmentsParams) => {
    setLoading(true);
    setError(null);
    try {
      const response = await departmentsApi.getAllDepartments(params);
      setLoading(false);
      return response;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch departments"
      );
      setLoading(false);
      throw err;
    }
  }, []);

  const getDepartmentById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await departmentsApi.getDepartmentById(id);
      setLoading(false);
      return response;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch department"
      );
      setLoading(false);
      throw err;
    }
  }, []);

  const updateDepartment = useCallback(
    async (id: string, data: UpdateDepartmentDto) => {
      setLoading(true);
      setError(null);
      try {
        const response = await departmentsApi.updateDepartment(id, data);
        setLoading(false);
        return response;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update department"
        );
        setLoading(false);
        throw err;
      }
    },
    []
  );

  const deactivateDepartment = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await departmentsApi.deactivateDepartment(id);
      setLoading(false);
      return response;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to deactivate department"
      );
      setLoading(false);
      throw err;
    }
  }, []);

  const getDepartmentHierarchy = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await departmentsApi.getDepartmentHierarchy();
      setLoading(false);
      return response;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch department hierarchy"
      );
      setLoading(false);
      throw err;
    }
  }, []);

  // ============ POSITION HOOKS ============
  const createPosition = useCallback(async (data: CreatePositionDto) => {
    setLoading(true);
    setError(null);
    try {
      const response = await positionsApi.createPosition(data);
      setLoading(false);
      return response;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create position"
      );
      setLoading(false);
      throw err;
    }
  }, []);

  const getPositions = useCallback(async (params?: GetPositionsParams) => {
    setLoading(true);
    setError(null);
    try {
      const response = await positionsApi.getAllPositions(params);
      setLoading(false);
      return response;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch positions"
      );
      setLoading(false);
      throw err;
    }
  }, []);

  const getPositionById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await positionsApi.getPositionById(id);
      setLoading(false);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch position");
      setLoading(false);
      throw err;
    }
  }, []);

  const updatePosition = useCallback(
    async (id: string, data: UpdatePositionDto) => {
      setLoading(true);
      setError(null);
      try {
        const response = await positionsApi.updatePosition(id, data);
        setLoading(false);
        return response;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update position"
        );
        setLoading(false);
        throw err;
      }
    },
    []
  );

  const deactivatePosition = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await positionsApi.deactivatePosition(id);
      setLoading(false);
      return response;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to deactivate position"
      );
      setLoading(false);
      throw err;
    }
  }, []);

  const getPositionHierarchy = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await positionsApi.getPositionHierarchy(id);
      setLoading(false);
      return response;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch position hierarchy"
      );
      setLoading(false);
      throw err;
    }
  }, []);

  // ============ CHANGE REQUEST HOOKS ============
  const createChangeRequest = useCallback(
    async (data: CreateStructureChangeRequestDto) => {
      setLoading(true);
      setError(null);
      try {
        const response = await changeRequestsApi.createChangeRequest(data);
        setLoading(false);
        return response;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create change request"
        );
        setLoading(false);
        throw err;
      }
    },
    []
  );

  const getChangeRequests = useCallback(
    async (params?: GetChangeRequestsParams) => {
      setLoading(true);
      setError(null);
      try {
        const response = await changeRequestsApi.getAllChangeRequests(params);
        setLoading(false);
        return response;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch change requests"
        );
        setLoading(false);
        throw err;
      }
    },
    []
  );

  const getChangeRequestById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await changeRequestsApi.getChangeRequestById(id);
      setLoading(false);
      return response;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch change request"
      );
      setLoading(false);
      throw err;
    }
  }, []);

  const updateChangeRequest = useCallback(
    async (id: string, data: UpdateStructureChangeRequestDto) => {
      setLoading(true);
      setError(null);
      try {
        const response = await changeRequestsApi.updateChangeRequest(id, data);
        setLoading(false);
        return response;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update change request"
        );
        setLoading(false);
        throw err;
      }
    },
    []
  );

  const submitChangeRequest = useCallback(
    async (id: string, data: SubmitChangeRequestDto) => {
      setLoading(true);
      setError(null);
      try {
        const response = await changeRequestsApi.submitChangeRequest(id, data);
        setLoading(false);
        return response;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to submit change request"
        );
        setLoading(false);
        throw err;
      }
    },
    []
  );

  const cancelChangeRequest = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await changeRequestsApi.cancelChangeRequest(id);
      setLoading(false);
      return response;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to cancel change request"
      );
      setLoading(false);
      throw err;
    }
  }, []);

  const getApprovedRequestFormData = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await changeRequestsApi.getApprovedRequestFormData(id);
      setLoading(false);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get form data");
      setLoading(false);
      throw err;
    }
  }, []);

  const approveChangeRequest = useCallback(
    async (id: string, comments?: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await changeRequestsApi.approveChangeRequest(
          id,
          comments
        );
        setLoading(false);
        return response;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to approve change request"
        );
        setLoading(false);
        throw err;
      }
    },
    []
  );

  const rejectChangeRequest = useCallback(
    async (id: string, comments?: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await changeRequestsApi.rejectChangeRequest(
          id,
          comments
        );
        setLoading(false);
        return response;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to reject change request"
        );
        setLoading(false);
        throw err;
      }
    },
    []
  );

  const markRequestAsImplemented = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await changeRequestsApi.markRequestAsImplemented(id);
      setLoading(false);
      return response;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to mark request as implemented"
      );
      setLoading(false);
      throw err;
    }
  }, []);

  // ============ APPROVAL HOOKS ============
  const createApproval = useCallback(
    async (data: CreateStructureApprovalDto) => {
      setLoading(true);
      setError(null);
      try {
        const response = await approvalsApi.createApproval(data);
        setLoading(false);
        return response;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create approval"
        );
        setLoading(false);
        throw err;
      }
    },
    []
  );

  const updateApprovalDecision = useCallback(
    async (id: string, data: UpdateApprovalDecisionDto) => {
      setLoading(true);
      setError(null);
      try {
        const response = await approvalsApi.updateApprovalDecision(id, data);
        setLoading(false);
        return response;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to update approval decision"
        );
        setLoading(false);
        throw err;
      }
    },
    []
  );

  const getRequestApprovals = useCallback(async (changeRequestId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await approvalsApi.getRequestApprovals(changeRequestId);
      setLoading(false);
      return response;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch approvals"
      );
      setLoading(false);
      throw err;
    }
  }, []);

  // ============ POSITION ASSIGNMENT HOOKS ============
  const createPositionAssignment = useCallback(
    async (data: CreatePositionAssignmentDto) => {
      setLoading(true);
      setError(null);
      try {
        const response = await positionAssignmentsApi.createPositionAssignment(
          data
        );
        setLoading(false);
        return response;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to create position assignment"
        );
        setLoading(false);
        throw err;
      }
    },
    []
  );

  const getEmployeeAssignments = useCallback(
    async (
      employeeProfileId: string,
      params?: GetEmployeeAssignmentsParams
    ) => {
      setLoading(true);
      setError(null);
      try {
        const response = await positionAssignmentsApi.getEmployeeAssignments(
          employeeProfileId,
          params
        );
        setLoading(false);
        return response;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch employee assignments"
        );
        setLoading(false);
        throw err;
      }
    },
    []
  );

  const getPositionAssignments = useCallback(async (positionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await positionAssignmentsApi.getPositionAssignments(
        positionId
      );
      setLoading(false);
      return response;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch position assignments"
      );
      setLoading(false);
      throw err;
    }
  }, []);

  const updatePositionAssignment = useCallback(
    async (id: string, data: UpdatePositionAssignmentDto) => {
      setLoading(true);
      setError(null);
      try {
        const response = await positionAssignmentsApi.updatePositionAssignment(
          id,
          data
        );
        setLoading(false);
        return response;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to update position assignment"
        );
        setLoading(false);
        throw err;
      }
    },
    []
  );

  const endPositionAssignment = useCallback(
    async (id: string, endDate: string | Date) => {
      setLoading(true);
      setError(null);
      try {
        const response = await positionAssignmentsApi.endPositionAssignment(
          id,
          endDate
        );
        setLoading(false);
        return response;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to end position assignment"
        );
        setLoading(false);
        throw err;
      }
    },
    []
  );

  // ============ CHANGE LOG HOOKS ============
  const getChangeLogs = useCallback(async (params?: GetChangeLogsParams) => {
    setLoading(true);
    setError(null);
    try {
      const response = await changeLogsApi.getChangeLogs(params);
      setLoading(false);
      return response;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch change logs"
      );
      setLoading(false);
      throw err;
    }
  }, []);

  const getEntityChangeLogs = useCallback(
    async (entityType: string, entityId: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await changeLogsApi.getEntityChangeLogs(
          entityType,
          entityId
        );
        setLoading(false);
        return response;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch entity change logs"
        );
        setLoading(false);
        throw err;
      }
    },
    []
  );

  // Helper functions from API modules
  const getStatusDisplay = changeRequestsApi.getStatusDisplay;
  const getRequestTypeDisplay = changeRequestsApi.getRequestTypeDisplay;
  const getDecisionDisplay = approvalsApi.getDecisionDisplay;
  const getActionDisplay = changeLogsApi.getActionDisplay;
  const isAssignmentActive = positionAssignmentsApi.isAssignmentActive;

  return {
    // State
    loading,
    error,
    clearError: () => setError(null),
    // Department methods
    createDepartment,
    getDepartments,
    getDepartmentById,
    updateDepartment,
    deactivateDepartment,
    getDepartmentHierarchy,

    // Position methods
    createPosition,
    getPositions,
    getPositionById,
    updatePosition,
    deactivatePosition,
    getPositionHierarchy,

    // Change Request methods
    createChangeRequest,
    getChangeRequests,
    getChangeRequestById,
    updateChangeRequest,
    submitChangeRequest,
    cancelChangeRequest,
    getApprovedRequestFormData,
    approveChangeRequest,
    rejectChangeRequest,
    markRequestAsImplemented,

    // Approval methods
    createApproval,
    updateApprovalDecision,
    getRequestApprovals,

    // Position Assignment methods
    createPositionAssignment,
    getEmployeeAssignments,
    getPositionAssignments,
    updatePositionAssignment,
    endPositionAssignment,

    // Change Log methods
    getChangeLogs,
    getEntityChangeLogs,

    // Helper functions
    getStatusDisplay,
    getRequestTypeDisplay,
    getDecisionDisplay,
    getActionDisplay,
    isAssignmentActive,
  };
};
