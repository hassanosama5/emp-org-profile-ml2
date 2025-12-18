// frontend/components/Performance/performanceDisputes.ts

// Match backend enum AppraisalDisputeStatus
export const APPRAISAL_DISPUTE_STATUSES = [
  "OPEN",
  "UNDER_REVIEW",
  "ADJUSTED",
  "REJECTED",
] as const;

export type AppraisalDisputeStatus =
  (typeof APPRAISAL_DISPUTE_STATUSES)[number];

// Basic dispute model (shape compatible with backend)
export interface AppraisalDispute {
  id?: string;
  _id?: string;

  appraisalId: string;
  employeeProfileId: string;

  status: AppraisalDisputeStatus;

  reason: string;
  details?: string;
  requestedChange?: string;

  hrResolverEmployeeId?: string;
  resolutionComment?: string;

  createdAt?: string;
  updatedAt?: string;
}

// Payload when an employee / HR employee files a dispute
export interface SubmitDisputeInput {
  reason: string;
  details?: string;
  requestedChange?: string;
}

// (Used later for Step 7)
export interface ResolveDisputeInput {
  resolutionStatus: Exclude<AppraisalDisputeStatus, "OPEN" | "UNDER_REVIEW">;
  resolutionComment?: string;
}
