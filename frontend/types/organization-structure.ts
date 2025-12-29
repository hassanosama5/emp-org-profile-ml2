// Organization Structure Types
import {
  StructureRequestType,
  StructureRequestStatus,
  ApprovalDecision,
  ChangeLogAction,
  AssignmentStatus,
} from "./enums";

// Department Types
export interface CreateDepartmentDto {
  code: string;
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

export interface DepartmentResponseDto {
  _id: string;
  code: string;
  name: string;
  description?: string;
  headPositionId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Position Types
export interface CreatePositionDto {
  code: string;
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

export interface PositionResponseDto {
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

// Position Assignment Types
export interface CreatePositionAssignmentDto {
  employeeProfileId: string;
  positionId: string;
  departmentId: string;
  startDate: string | Date;
  endDate?: string | Date;
  changeRequestId?: string;
  reason?: string;
  notes?: string;
}

export interface UpdatePositionAssignmentDto {
  endDate?: string | Date;
  reason?: string;
  notes?: string;
}

export interface PositionAssignmentResponseDto {
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

// Change Request Types
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

export interface StructureChangeRequestResponseDto {
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

// Approval Types
export interface CreateStructureApprovalDto {
  changeRequestId: string;
  approverEmployeeId: string;
  comments?: string;
}

export interface UpdateApprovalDecisionDto {
  decision: ApprovalDecision;
  comments?: string;
}

export interface StructureApprovalResponseDto {
  _id: string;
  changeRequestId: string;
  approverEmployeeId: string;
  decision: ApprovalDecision;
  decidedAt?: Date;
  comments?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Change Log Types
export interface StructureChangeLogResponseDto {
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

// Hierarchy Types
export interface DepartmentHierarchyNode {
  department: DepartmentResponseDto;
  positions: PositionResponseDto[];
  subDepartments?: DepartmentHierarchyNode[];
}

export interface PositionHierarchyNode {
  position: PositionResponseDto;
  reportsTo?: PositionHierarchyNode;
  directReports?: PositionHierarchyNode[];
}

// Query Parameter Types
export interface GetDepartmentsParams {
  isActive?: boolean;
}

export interface GetPositionsParams {
  departmentId?: string;
  isActive?: boolean;
}

export interface GetChangeRequestsParams {
  status?: StructureRequestStatus;
}

export interface GetChangeLogsParams {
  entityType?: string;
  entityId?: string;
}

export interface GetEmployeeAssignmentsParams {
  activeOnly?: boolean;
}
export { StructureRequestStatus, ApprovalDecision };
