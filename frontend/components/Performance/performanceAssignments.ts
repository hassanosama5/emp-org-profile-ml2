// frontend/components/Performance/performanceAssignments.ts

import type { AppraisalTemplate } from "./performanceTemplates";

// Keep status flexible but document the main ones
export type AppraisalAssignmentStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "CANCELED"
  | string;

// We don't fully know the shape of populated refs (employeeProfileId, cycleId),
// so we type them as any but keep ids where useful.
export interface AppraisalAssignment {
  id?: string;
  _id?: string;

  cycleId: any; // populated cycle document or ObjectId
  templateId: AppraisalTemplate | any;
  employeeProfileId: any;
  managerProfileId: string;

  departmentId?: string;
  positionId?: string;

  status: AppraisalAssignmentStatus;
  dueDate?: string;
  assignedAt?: string;
  latestAppraisalId?: string;
}
