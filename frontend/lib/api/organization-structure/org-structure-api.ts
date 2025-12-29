import { api } from "../client";
// NOTE: The api interceptor returns response.data directly, so we use type assertions
// to tell TypeScript the actual return type (not AxiosResponse)

// Interfaces for Organization Structure - These will be refined based on backend API
export interface Department {
  _id: string;
  code: string;
  name: string;
  description?: string;
  headPositionId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Position {
  _id: string;
  code: string;
  title: string;
  description?: string;
  departmentId: string;
  reportsToPositionId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDepartmentDto {
  code?: string;
  name: string;
  description?: string;
  headPositionId?: string;
}

export interface UpdateDepartmentDto {
  code?: string;
  name?: string;
  description?: string;
  headPositionId?: string;
  isActive?: boolean;
}

export interface CreatePositionDto {
  code?: string;
  title: string;
  description?: string;
  departmentId: string;
  reportsToPositionId?: string;
}

export interface UpdatePositionDto {
  code?: string;
  title?: string;
  description?: string;
  departmentId?: string;
  reportsToPositionId?: string;
  isActive?: boolean;
}

export interface PositionAssignment {
  _id: string;
  employeeProfileId: string;
  positionId: string;
  departmentId: string;
  startDate: Date;
  endDate?: Date;
  changeRequestId?: string;
  reason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePositionAssignmentDto {
  employeeProfileId: string;
  positionId: string;
  departmentId: string;
  startDate: string;
  endDate?: string;
  changeRequestId?: string;
  reason?: string;
  notes?: string;
}

export interface UpdatePositionAssignmentDto {
  endDate?: string;
  reason?: string;
  notes?: string;
}

export enum StructureRequestType {
  NEW_DEPARTMENT = 'NEW_DEPARTMENT',
  UPDATE_DEPARTMENT = 'UPDATE_DEPARTMENT',
  NEW_POSITION = 'NEW_POSITION',
  UPDATE_POSITION = 'UPDATE_POSITION',
  CLOSE_POSITION = 'CLOSE_POSITION',
}

export enum StructureRequestStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELED = 'CANCELED',
  IMPLEMENTED = 'IMPLEMENTED',
}

export enum ApprovalDecision {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ChangeLogAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DEACTIVATED = 'DEACTIVATED',
  REASSIGNED = 'REASSIGNED',
}

export interface StructureChangeRequest {
  _id: string;
  requestNumber: string;
  requestedByEmployeeId: string;
  requestType: StructureRequestType;
  targetDepartmentId?: string;
  targetPositionId?: string;
  details?: string;
  reason?: string;
  status: StructureRequestStatus;
  submittedByEmployeeId?: string;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStructureChangeRequestDto {
  requestedByEmployeeId: string;
  requestType: StructureRequestType;
  targetDepartmentId?: string;
  targetPositionId?: string;
  details?: string;
  reason?: string;
}

export interface UpdateStructureChangeRequestDto {
  requestType?: StructureRequestType;
  targetDepartmentId?: string;
  targetPositionId?: string;
  details?: string;
  reason?: string;
}

export interface SubmitChangeRequestDto {
  submittedByEmployeeId: string;
}

export interface StructureApproval {
  _id: string;
  changeRequestId: string;
  approverEmployeeId: string;
  decision: ApprovalDecision;
  comments?: string;
  decidedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStructureApprovalDto {
  changeRequestId: string;
  approverEmployeeId: string;
}

export interface UpdateApprovalDecisionDto {
  decision: ApprovalDecision;
  comments?: string;
}

export interface StructureChangeLog {
  _id: string;
  action: ChangeLogAction;
  entityType: string;
  entityId: string;
  performedByEmployeeId?: string;
  summary?: string;
  beforeSnapshot?: Record<string, unknown>;
  afterSnapshot?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// API calls for Departments
// NOTE: The Axios interceptor returns response.data directly, so we don't need to access .data here
export const organizationStructureApi = {
  createDepartment: async (data: CreateDepartmentDto): Promise<Department> => {
    const response = await api.post("/organization-structure/departments", data);
    return response as unknown as Department;
  },

  getDepartments: async (isActive?: boolean): Promise<Department[]> => {
    const params = isActive !== undefined ? { isActive } : {};
    return (await api.get("/organization-structure/departments", { params })) as unknown as Department[];
  },

  getDepartmentById: async (id: string): Promise<Department> => {
    return (await api.get(`/organization-structure/departments/${id}`)) as unknown as Department;
  },

  updateDepartment: async (id: string, data: UpdateDepartmentDto): Promise<Department> => {
    return (await api.put(`/organization-structure/departments/${id}`, data)) as unknown as Department;
  },

  deactivateDepartment: async (id: string): Promise<void> => {
    await api.delete(`/organization-structure/departments/${id}`);
  },

  getDepartmentHierarchy: async (): Promise<any> => {
    return await api.get("/organization-structure/departments/hierarchy/all");
  },

  // API calls for Positions
  createPosition: async (data: CreatePositionDto): Promise<Position> => {
    return (await api.post("/organization-structure/positions", data)) as unknown as Position;
  },

  getPositions: async (departmentId?: string, isActive?: boolean): Promise<Position[]> => {
    const params: { departmentId?: string; isActive?: boolean } = {};
    if (departmentId) {
      params.departmentId = departmentId;
    }
    if (isActive !== undefined) {
      params.isActive = isActive;
    }
    return (await api.get("/organization-structure/positions", { params })) as unknown as Position[];
  },

  getPositionById: async (id: string): Promise<Position> => {
    return (await api.get(`/organization-structure/positions/${id}`)) as unknown as Position;
  },

  updatePosition: async (id: string, data: UpdatePositionDto): Promise<Position> => {
    return (await api.put(`/organization-structure/positions/${id}`, data)) as unknown as Position;
  },

  deactivatePosition: async (id: string): Promise<void> => {
    await api.delete(`/organization-structure/positions/${id}`);
  },

  getPositionHierarchy: async (id: string): Promise<any> => {
    return await api.get(`/organization-structure/positions/${id}/hierarchy`);
  },

  // API calls for Position Assignments
  createPositionAssignment: async (data: CreatePositionAssignmentDto): Promise<PositionAssignment> => {
    return (await api.post("/organization-structure/assignments", data)) as unknown as PositionAssignment;
  },

  getEmployeeAssignments: async (employeeProfileId: string, activeOnly?: boolean): Promise<PositionAssignment[]> => {
    const params = activeOnly !== undefined ? { activeOnly } : {};
    return (await api.get(`/organization-structure/assignments/employee/${employeeProfileId}`, { params })) as unknown as PositionAssignment[];
  },

  getPositionAssignments: async (positionId: string): Promise<PositionAssignment[]> => {
    return (await api.get(`/organization-structure/assignments/position/${positionId}`)) as unknown as PositionAssignment[];
  },

  updatePositionAssignment: async (id: string, data: UpdatePositionAssignmentDto): Promise<PositionAssignment> => {
    return (await api.patch(`/organization-structure/assignments/${id}`, data)) as unknown as PositionAssignment;
  },

  endPositionAssignment: async (id: string, endDate: string): Promise<PositionAssignment> => {
    return (await api.patch(`/organization-structure/assignments/${id}/end`, { endDate })) as unknown as PositionAssignment;
  },

  // API calls for Change Requests
  createChangeRequest: async (data: CreateStructureChangeRequestDto): Promise<StructureChangeRequest> => {
    return (await api.post("/organization-structure/change-requests", data)) as unknown as StructureChangeRequest;
  },

  getAllChangeRequests: async (status?: StructureRequestStatus): Promise<StructureChangeRequest[]> => {
    const params = status ? { status } : {};
    return (await api.get("/organization-structure/change-requests", { params })) as unknown as StructureChangeRequest[];
  },

  getChangeRequestById: async (id: string): Promise<StructureChangeRequest> => {
    return (await api.get(`/organization-structure/change-requests/${id}`)) as unknown as StructureChangeRequest;
  },

  updateChangeRequest: async (id: string, data: UpdateStructureChangeRequestDto): Promise<StructureChangeRequest> => {
    return (await api.put(`/organization-structure/change-requests/${id}`, data)) as unknown as StructureChangeRequest;
  },

  submitChangeRequest: async (id: string, data: SubmitChangeRequestDto): Promise<StructureChangeRequest> => {
    return (await api.post(`/organization-structure/change-requests/${id}/submit`, data)) as unknown as StructureChangeRequest;
  },

  cancelChangeRequest: async (id: string): Promise<StructureChangeRequest> => {
    return (await api.post(`/organization-structure/change-requests/${id}/cancel`)) as unknown as StructureChangeRequest;
  },

  // API calls for Approvals
  createApproval: async (data: CreateStructureApprovalDto): Promise<StructureApproval> => {
    return (await api.post("/organization-structure/approvals", data)) as unknown as StructureApproval;
  },

  updateApprovalDecision: async (id: string, data: UpdateApprovalDecisionDto): Promise<StructureApproval> => {
    return (await api.patch(`/organization-structure/approvals/${id}/decision`, data)) as unknown as StructureApproval;
  },

  getRequestApprovals: async (changeRequestId: string): Promise<StructureApproval[]> => {
    return (await api.get(`/organization-structure/approvals/change-request/${changeRequestId}`)) as unknown as StructureApproval[];
  },

  // API calls for Change Logs
  getChangeLogs: async (entityType?: string, entityId?: string): Promise<StructureChangeLog[]> => {
    const params: { entityType?: string; entityId?: string } = {};
    if (entityType) {
      params.entityType = entityType;
    }
    if (entityId) {
      params.entityId = entityId;
    }
    return (await api.get("/organization-structure/change-logs", { params })) as unknown as StructureChangeLog[];
  },

  getEntityChangeLogs: async (entityType: string, entityId: string): Promise<StructureChangeLog[]> => {
    return (await api.get(`/organization-structure/change-logs/${entityType}/${entityId}`)) as unknown as StructureChangeLog[];
  },
};
